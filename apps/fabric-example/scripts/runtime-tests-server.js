#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const { spawn, execFile } = require('child_process');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.WebSocketServer || WebSocket.Server;

const LIBRARIES = ['reanimated', 'worklets', 'self-tests'];
const PLATFORMS = ['ios', 'android'];
const BOOLEAN_FLAGS = new Set(['launch', 'skip-build']);
const BUNDLE_ID = 'org.reactjs.native.example.FabricExample';
const ANDROID_APP_ID = 'com.fabricexample';

const args = parseArgs(process.argv.slice(2));
const LIBRARY = String(args.library ?? '').toLowerCase();
const PLATFORM = String(args.platform ?? 'ios').toLowerCase();
const METRO_PORT = Number(args['metro-port'] ?? 8081);
const CONFIGURATION = args.configuration ?? 'DebugRuntimeTests';
const IS_RELEASE = CONFIGURATION.startsWith('Release');
// Release builds have no Metro; the app then reports to port 8082.
const PORT = Number(args.port ?? (IS_RELEASE ? 8082 : METRO_PORT + 1));
const ONLY = args.only
  ? args.only
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null;
const INCLUDE = args.include
  ? args.include
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
const SERIAL = args.serial ?? null;
const AVD = args.avd ?? null;

if (!LIBRARIES.includes(LIBRARY)) {
  console.error(
    `[runtime-tests] --library must be one of: ${LIBRARIES.join(', ')} (got: ${LIBRARY || 'nothing'})`
  );
  process.exit(1);
}

if (!PLATFORMS.includes(PLATFORM)) {
  console.error(
    `[runtime-tests] --platform must be one of: ${PLATFORMS.join(', ')} (got: ${PLATFORM})`
  );
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');
const androidDir = path.join(projectRoot, 'android');

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
      if (PLATFORM === 'android') {
        console.error(
          '[runtime-tests] Check `adb logcat` for crashes (grep AndroidRuntime or ReactNative)'
        );
      } else {
        console.error(
          '[runtime-tests] Check the iOS simulator log for crashes (Xcode → Devices → View Device Logs)'
        );
      }
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

  const requested = [...(ONLY ?? []), ...(INCLUDE ?? [])];
  const unknown = requested.filter((name) => !declared.includes(name));
  if (unknown.length > 0) {
    console.error(
      `[runtime-tests] unknown suite name(s): ${unknown.join(', ')}`
    );
    console.error(`[runtime-tests] available suites: ${declared.join(', ')}`);
    send({ type: 'error', message: `Unknown suites: ${unknown.join(', ')}` });
    shutdown(1);
    return;
  }

  runStartedAt = Date.now();
  send({
    type: 'start',
    ...(ONLY ? { only: ONLY } : {}),
    ...(INCLUDE ? { include: INCLUDE } : {}),
  });
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
  if (client) {
    client.close();
  } else {
    shutdown(exitCode);
  }
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
      process.kill(-metroChild.pid, 'SIGTERM');
    } catch {
      try {
        metroChild.kill('SIGTERM');
      } catch {
        /* ignore */
      }
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
    `[runtime-tests] starting Metro (\`yarn start --port ${METRO_PORT} --reset-cache\`)`
  );
  // --reset-cache: a Metro cache produced under a different Bundle Mode
  // setting serves stale module maps ("Requiring unknown module").
  // detached: Metro must get its own process group so shutdown can kill the
  // whole tree — killing just the yarn wrapper orphans the actual Metro process.
  metroChild = spawn(
    'yarn',
    ['start', '--port', String(METRO_PORT), '--reset-cache'],
    {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    }
  );
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

function sdkTool(dir, name) {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (sdkRoot) {
    const candidate = path.join(sdkRoot, dir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return name;
}

const ADB = sdkTool('platform-tools', 'adb');

function adb(serial, adbArgs, options = {}) {
  return run(ADB, ['-s', serial, ...adbArgs], options);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listAndroidDevices() {
  const { stdout } = await run(ADB, ['devices']);
  return stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === 'device')
    .map((parts) => parts[0]);
}

async function resolveAndroidDevice() {
  const serials = await listAndroidDevices();

  if (SERIAL) {
    if (!serials.includes(SERIAL)) {
      throw new Error(
        `No connected Android device with serial ${SERIAL} (see \`adb devices\`)`
      );
    }
    return SERIAL;
  }

  if (serials.length > 0) {
    if (serials.length > 1) {
      console.log(
        `[runtime-tests] multiple Android devices connected, using ${serials[0]}`
      );
    }
    return serials[0];
  }

  const emulatorBin = sdkTool('emulator', 'emulator');
  const { stdout } = await run(emulatorBin, ['-list-avds']);
  const avds = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('INFO'));
  const avd = AVD ?? avds[0];
  if (!avd) {
    throw new Error(
      'No Android device connected and no AVDs available (see `emulator -list-avds`)'
    );
  }

  console.log(`[runtime-tests] booting emulator ${avd}`);
  const child = spawn(
    emulatorBin,
    ['-avd', avd, '-no-snapshot-save', '-no-boot-anim', '-no-audio'],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();

  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    const booted = await listAndroidDevices();
    if (booted.length > 0) {
      const { stdout: bootCompleted } = await adb(booted[0], [
        'shell',
        'getprop',
        'sys.boot_completed',
      ]).catch(() => ({ stdout: '' }));
      if (bootCompleted.trim() === '1') {
        return booted[0];
      }
    }
    await sleep(2000);
  }
  throw new Error(`Emulator ${avd} did not boot within 300s`);
}

async function buildAndroidApp(serial) {
  const abi = await adb(serial, ['shell', 'getprop', 'ro.product.cpu.abi'])
    .then(({ stdout }) => stdout.trim())
    .catch(() => null);
  console.log(
    `[runtime-tests] building with gradle (assemble${CONFIGURATION}${abi ? `, ABI ${abi}` : ''})… this can take a while`
  );
  const gradleArgs = [`assemble${CONFIGURATION}`];
  if (!IS_RELEASE) {
    gradleArgs.push(`-PreactNativeDevServerPort=${METRO_PORT}`);
  }
  if (abi) {
    gradleArgs.push(`-PreactNativeArchitectures=${abi}`);
  }
  await run(path.join(androidDir, 'gradlew'), gradleArgs, { cwd: androidDir });
}

async function installAndLaunchAndroid(serial) {
  const buildType = CONFIGURATION[0].toLowerCase() + CONFIGURATION.slice(1);
  const apk = path.join(
    androidDir,
    'app',
    'build',
    'outputs',
    'apk',
    buildType,
    `app-${buildType}.apk`
  );
  if (!fs.existsSync(apk)) {
    throw new Error(`APK not found at ${apk} — run once without --skip-build`);
  }
  console.log(`[runtime-tests] installing ${apk}`);
  await adb(serial, ['install', '-r', apk]);

  for (const port of [METRO_PORT, PORT]) {
    await adb(serial, ['reverse', `tcp:${port}`, `tcp:${port}`]).catch(
      () => {}
    );
  }

  await adb(serial, ['shell', 'am', 'force-stop', ANDROID_APP_ID]).catch(
    () => {}
  );
  console.log(
    `[runtime-tests] launching ${ANDROID_APP_ID} with RUNTIME_TESTS_LIBRARY=${LIBRARY}`
  );
  await adb(serial, [
    'shell',
    'am',
    'start',
    // A force-stopped app can otherwise be recreated from the stale recents
    // task record, whose base intent carries no extras.
    '--activity-clear-task',
    '-n',
    `${ANDROID_APP_ID}/.MainActivity`,
    '--es',
    'RUNTIME_TESTS_LIBRARY',
    LIBRARY,
  ]);
}

if (SHOULD_LAUNCH) {
  (async () => {
    if (!IS_RELEASE) {
      await ensureMetroRunning();
    }
    if (PLATFORM === 'android') {
      const serial = await resolveAndroidDevice();
      if (!SKIP_BUILD) {
        await buildAndroidApp(serial);
      }
      await installAndLaunchAndroid(serial);
    } else {
      const device = await resolveSimulator();
      await ensureBooted(device);
      if (!SKIP_BUILD) {
        await buildApp();
      }
      await installAndLaunch(device.udid);
    }
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
      if (!BOOLEAN_FLAGS.has(key)) {
        console.error(`[runtime-tests] --${key} requires a value`);
        process.exit(1);
      }
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
