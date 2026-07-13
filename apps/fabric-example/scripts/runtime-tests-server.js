#!/usr/bin/env node
/**
 * Host-side runner for the iOS DebugRuntimeTests scheme.
 *
 * Usage:
 *   node scripts/runtime-tests-server.js --library <reanimated|worklets>
 *                                        [--launch] [--skip-build]
 *                                        [--only foo,bar]
 *                                        [--metro-port 8081] [--port <metro+1>]
 *                                        [--simulator "iPhone 17"] [--udid <UDID>]
 *                                        [--configuration DebugRuntimeTests]
 *                                        [--connect-timeout 600] [--idle-timeout 600]
 *
 *   --library         Which library's tests the connecting app must run.
 *                     Exactly one of `reanimated` or `worklets`. Required.
 *   --launch          Also build (xcodebuild), install and launch the app on
 *                     the simulator after the server is listening. Without it,
 *                     the server just waits for a device to connect.
 *   --skip-build      With --launch: skip xcodebuild and reuse the app that is
 *                     already installed (or in the build products directory).
 *   --only            Comma-separated suite filter forwarded in the `start`
 *                     envelope.
 *   --metro-port      Metro port to probe/start. Defaults to 8081.
 *   --port            WebSocket port to listen on. Defaults to metro-port + 1,
 *                     which is also what the app derives from its bundle URL.
 *   --simulator       Simulator name used when `--launch` is set. Defaults to
 *                     "iPhone 17"; falls back to the first available iPhone.
 *   --udid            Simulator UDID. Takes precedence over --simulator.
 *   --connect-timeout Seconds to wait for the first client, counted from app
 *                     launch when --launch is set (so a slow xcodebuild does
 *                     not eat the budget). Default 600.
 *   --idle-timeout    Seconds without any message before aborting. Default 600.
 */

const path = require('path');
const net = require('net');
const http = require('http');
const { spawn, execFile } = require('child_process');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.WebSocketServer || WebSocket.Server;

const LIBRARIES = ['reanimated', 'worklets'];
const BUNDLE_ID = 'org.reactjs.native.example.FabricExample';

const args = parseArgs(process.argv.slice(2));
const LIBRARY = String(args.library ?? '').toLowerCase();
const METRO_PORT = Number(args['metro-port'] ?? 8081);
const PORT = Number(args.port ?? METRO_PORT + 1);
const ONLY = args.only
  ? args.only
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null;
const CONNECT_TIMEOUT_MS = Number(args['connect-timeout'] ?? 600) * 1000;
const IDLE_TIMEOUT_MS = Number(args['idle-timeout'] ?? 600) * 1000;
const SHOULD_LAUNCH = args.launch === true || args.launch === '';
const SKIP_BUILD = args['skip-build'] === true || args['skip-build'] === '';
const SIMULATOR = args.simulator ?? 'iPhone 17';
const UDID = args.udid ?? null;
const CONFIGURATION = args.configuration ?? 'DebugRuntimeTests';

if (!LIBRARIES.includes(LIBRARY)) {
  console.error(
    `[runtime-tests] --library must be one of: ${LIBRARIES.join(', ')} (got: ${LIBRARY || 'nothing'})`
  );
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');

let client = null;
let runStartedAt = 0;
let exitCode = 1;
let runFinished = false;
let connectTimer = null;
let idleTimer = null;
let metroChild = null;

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

wss.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[runtime-tests] port ${PORT} is already in use — is another runtime-tests server (or Metro) running there? Stop it or pass --port.`
    );
  } else {
    console.error(`[runtime-tests] server error: ${error.message}`);
  }
  process.exit(1);
});

console.log(
  `[runtime-tests] listening on ws://0.0.0.0:${PORT} (library: ${LIBRARY})`
);
if (ONLY) {
  console.log(`[runtime-tests] suite filter: ${ONLY.join(', ')}`);
}

function armConnectTimer() {
  if (client) {
    return;
  }
  connectTimer = setTimeout(() => {
    console.error(
      `[runtime-tests] no device connected within ${CONNECT_TIMEOUT_MS / 1000}s, exiting`
    );
    shutdown(1);
  }, CONNECT_TIMEOUT_MS);
}

if (!SHOULD_LAUNCH) {
  armConnectTimer();
}

wss.on('connection', (socket) => {
  if (client) {
    console.warn(
      '[runtime-tests] rejecting extra client; one already connected'
    );
    socket.close();
    return;
  }
  client = socket;
  clearTimer('connect');
  console.log('[runtime-tests] device connected');

  resetIdleTimer();

  socket.on('message', (raw) => {
    resetIdleTimer();
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (error) {
      console.warn('[runtime-tests] failed to parse message:', error.message);
      return;
    }
    handleMessage(msg);
  });

  socket.on('close', () => {
    if (!runFinished && runStartedAt > 0) {
      console.error('');
      console.error('========================================');
      console.error(
        '[runtime-tests] device disconnected mid-run without sending `done`.'
      );
      console.error(
        '[runtime-tests] Check the iOS simulator log for crashes (Xcode → Devices → View Device Logs)'
      );
      console.error(
        '[runtime-tests] or grep `[remoteReporter]` in Metro output for the WS close reason.'
      );
      console.error('========================================');
    } else {
      console.log('[runtime-tests] device disconnected');
    }
    shutdown(exitCode);
  });

  socket.on('error', (error) => {
    console.error('[runtime-tests] socket error:', error.message);
  });
});

function handleMessage(msg) {
  switch (msg.type) {
    case 'hello':
      onHello(msg);
      break;
    case 'log':
      onLog(msg);
      break;
    case 'done':
      onDone(msg);
      break;
    case 'error':
      onError(msg);
      break;
    default:
      console.warn(`[runtime-tests] unknown message type: ${msg.type}`);
  }
}

function onHello(msg) {
  const declared = (msg.suites ?? []).map((s) => s.name);
  const deviceLibrary = String(msg.library ?? '').toLowerCase();
  console.log(
    `[runtime-tests] hello from ${msg.platform} ${msg.platformVersion} (${deviceLibrary}), ${declared.length} suites declared: ${declared.join(', ')}`
  );

  if (deviceLibrary !== LIBRARY) {
    console.error(
      `[runtime-tests] the app is running the ${deviceLibrary || 'unknown'} entry point but this server expects ${LIBRARY}.`
    );
    console.error(
      '[runtime-tests] Relaunch via --launch (which sets RUNTIME_TESTS_LIBRARY) or restart the app with the right entry point.'
    );
    send({ type: 'error', message: `Library mismatch: ${deviceLibrary}` });
    shutdown(1);
    return;
  }

  if (ONLY) {
    const unknown = ONLY.filter((name) => !declared.includes(name));
    if (unknown.length > 0) {
      console.error(
        `[runtime-tests] unknown suite name(s): ${unknown.join(', ')}`
      );
      console.error(
        `[runtime-tests] available suites: ${declared.join(', ')}`
      );
      send({ type: 'error', message: `Unknown suites: ${unknown.join(', ')}` });
      shutdown(1);
      return;
    }
  }

  runStartedAt = Date.now();
  send({ type: 'start', ...(ONLY ? { only: ONLY } : {}) });
  console.log('[runtime-tests] start sent, running tests…');
}

function onLog(msg) {
  const logArgs = Array.isArray(msg.args) ? msg.args : [];
  const line = logArgs.join(' ');
  switch (msg.level) {
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
    default:
      console.log(line);
  }
}

function onDone(msg) {
  const elapsed = ((Date.now() - runStartedAt) / 1000).toFixed(1);
  console.log('');
  console.log('========================================');
  console.log(`[runtime-tests] ${LIBRARY} run finished in ${elapsed}s`);
  console.log(
    `[runtime-tests] passed: ${msg.passed}, failed: ${msg.failed}, skipped: ${msg.skipped}`
  );
  if (msg.failed > 0) {
    console.log('[runtime-tests] Failed tests:');
    for (const name of msg.failedTests ?? []) {
      console.log(`  • ${name}`);
    }
  } else {
    console.log('[runtime-tests] All tests passed!');
  }
  console.log('========================================');
  exitCode = msg.failed > 0 ? 1 : 0;
  runFinished = true;
  if (client) {
    client.close();
  } else {
    shutdown(exitCode);
  }
}

function onError(msg) {
  console.error(`[runtime-tests] device reported error: ${msg.message}`);
  if (msg.stack) {
    console.error(msg.stack);
  }
  exitCode = 1;
  runFinished = true;
}

function send(payload) {
  if (client && client.readyState === client.OPEN) {
    client.send(JSON.stringify(payload));
  }
}

function resetIdleTimer() {
  clearTimer('idle');
  idleTimer = setTimeout(() => {
    console.error(
      `[runtime-tests] no traffic for ${IDLE_TIMEOUT_MS / 1000}s, assuming the run is stuck`
    );
    shutdown(1);
  }, IDLE_TIMEOUT_MS);
}

function clearTimer(which) {
  if (which === 'connect' && connectTimer) {
    clearTimeout(connectTimer);
    connectTimer = null;
  }
  if (which === 'idle' && idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function shutdown(code) {
  clearTimer('connect');
  clearTimer('idle');
  if (metroChild && !metroChild.killed) {
    try {
      metroChild.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  wss.close(() => {
    process.exit(code);
  });
  setTimeout(() => process.exit(code), 1000).unref();
}

function run(cmd, cmdArgs, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      cmdArgs,
      { maxBuffer: 64 * 1024 * 1024, ...options },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}

function probeTcp(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

// Metro answers `GET /status` with the literal body "packager-status:running".
// Use this rather than a raw TCP probe so we don't get fooled by a half-closed
// socket or a different server happening to be on the port.
function probeMetro(timeoutMs = 1000) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port: METRO_PORT,
        path: '/status',
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve(body.includes('packager-status:running'));
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function ensureMetroRunning() {
  if (await probeMetro()) {
    console.log(
      `[runtime-tests] Metro already running on :${METRO_PORT}, reusing it`
    );
    return;
  }
  if (await probeTcp('127.0.0.1', METRO_PORT)) {
    throw new Error(
      `Port ${METRO_PORT} is in use but not responding as Metro. Kill the stale process or pass --metro-port.`
    );
  }
  console.log(
    `[runtime-tests] starting Metro (\`yarn start --port ${METRO_PORT}\`)`
  );
  metroChild = spawn('yarn', ['start', '--port', String(METRO_PORT)], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  metroChild.stdout.on('data', (chunk) => {
    process.stdout.write(`[metro] ${chunk}`);
  });
  metroChild.stderr.on('data', (chunk) => {
    process.stderr.write(`[metro] ${chunk}`);
  });
  metroChild.on('exit', (code) => {
    if (!runFinished) {
      console.error(`[runtime-tests] Metro exited with code ${code}`);
    }
  });

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await probeMetro()) {
      console.log(`[runtime-tests] Metro is up on :${METRO_PORT}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Metro did not respond to /status within 180s`);
}

async function resolveSimulator() {
  const { stdout } = await run('xcrun', [
    'simctl',
    'list',
    'devices',
    'available',
    '--json',
  ]);
  const devices = Object.values(JSON.parse(stdout).devices).flat();

  if (UDID) {
    const device = devices.find((d) => d.udid === UDID);
    if (!device) {
      throw new Error(`No available simulator with UDID ${UDID}`);
    }
    return device;
  }

  const byName = devices.find((d) => d.name === SIMULATOR);
  if (byName) {
    return byName;
  }

  const iphones = devices.filter((d) => d.name.startsWith('iPhone'));
  const fallback = iphones.find((d) => d.state === 'Booted') ?? iphones[0];
  if (!fallback) {
    throw new Error(
      `No simulator named "${SIMULATOR}" and no iPhone simulators available`
    );
  }
  console.log(
    `[runtime-tests] simulator "${SIMULATOR}" not found, using "${fallback.name}"`
  );
  return fallback;
}

async function ensureBooted(device) {
  if (device.state !== 'Booted') {
    console.log(`[runtime-tests] booting ${device.name} (${device.udid})`);
    await run('xcrun', ['simctl', 'boot', device.udid]).catch((error) => {
      if (!String(error.stderr).includes('current state: Booted')) {
        throw error;
      }
    });
  }
  await run('xcrun', ['simctl', 'bootstatus', device.udid]);
}

async function buildApp() {
  console.log(
    `[runtime-tests] building with xcodebuild (${CONFIGURATION})… this can take a few minutes`
  );
  await run(
    'xcodebuild',
    [
      '-workspace',
      'FabricExample.xcworkspace',
      '-scheme',
      'DebugRuntimeTests',
      '-configuration',
      CONFIGURATION,
      '-destination',
      'generic/platform=iOS Simulator',
      'build',
    ],
    { cwd: iosDir }
  );
}

// The products directory depends on the machine's DerivedData configuration,
// so resolve it from xcodebuild instead of hardcoding a path.
async function appPath() {
  const { stdout } = await run(
    'xcodebuild',
    [
      '-workspace',
      'FabricExample.xcworkspace',
      '-scheme',
      'DebugRuntimeTests',
      '-configuration',
      CONFIGURATION,
      '-destination',
      'generic/platform=iOS Simulator',
      '-showBuildSettings',
      '-json',
    ],
    { cwd: iosDir }
  );
  const entries = JSON.parse(stdout.slice(stdout.indexOf('[')));
  const entry =
    entries.find(
      (candidate) => candidate.buildSettings.WRAPPER_NAME === 'FabricExample.app'
    ) ?? entries[0];
  const { TARGET_BUILD_DIR, WRAPPER_NAME } = entry.buildSettings;
  return path.join(TARGET_BUILD_DIR, WRAPPER_NAME);
}

async function installAndLaunch(udid) {
  const app = await appPath();
  console.log(`[runtime-tests] installing ${app}`);
  await run('xcrun', ['simctl', 'install', udid, app]);

  // Point the app at the right Metro instance. NSUserDefaults are cleared on
  // reinstall, so this has to happen after `simctl install`.
  await run('xcrun', [
    'simctl',
    'spawn',
    udid,
    'defaults',
    'write',
    BUNDLE_ID,
    'RCT_jsLocation',
    `localhost:${METRO_PORT}`,
  ]);

  await run('xcrun', ['simctl', 'terminate', udid, BUNDLE_ID]).catch(() => {});
  console.log(
    `[runtime-tests] launching ${BUNDLE_ID} with RUNTIME_TESTS_LIBRARY=${LIBRARY}`
  );
  await run(
    'xcrun',
    ['simctl', 'launch', udid, BUNDLE_ID],
    {
      env: {
        ...process.env,
        SIMCTL_CHILD_RUNTIME_TESTS_LIBRARY: LIBRARY,
      },
    }
  );
}

if (SHOULD_LAUNCH) {
  (async () => {
    await ensureMetroRunning();
    const device = await resolveSimulator();
    await ensureBooted(device);
    if (!SKIP_BUILD) {
      await buildApp();
    }
    await installAndLaunch(device.udid);
    armConnectTimer();
  })().catch((error) => {
    console.error(`[runtime-tests] ${error.message}`);
    if (error.stderr) {
      console.error(String(error.stderr).slice(-4000));
    }
    shutdown(1);
  });
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
