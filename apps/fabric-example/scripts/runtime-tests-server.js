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
const BOOLEAN_FLAGS = new Set(['launch', 'skip-build', 'build-only', 'help']);
const BUNDLE_ID = 'org.reactjs.native.example.FabricExample';
const ANDROID_APP_ID = 'com.fabricexample';

const projectRoot = path.resolve(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');
const androidDir = path.join(projectRoot, 'android');
const SANITIZER_REPORT_DIR = path.join(projectRoot, 'sanitizer-reports');
// -enable*Sanitizer alone does not reach the Pods project on CI (the built
// products carried no -fsanitize flags), so each build setting is also forced
// as a command-line override, which applies to every target.
/**
 * @type {Record<
 *   string,
 *   {
 *     buildArgs: string[];
 *     launchEnv: Record<string, string>;
 *     runtimePrefix: string;
 *   }
 * >}
 */
const SANITIZERS = {
  thread: {
    buildArgs: ['-enableThreadSanitizer', 'YES', 'ENABLE_THREAD_SANITIZER=YES'],
    launchEnv: {
      SIMCTL_CHILD_TSAN_OPTIONS: `log_path=${path.join(SANITIZER_REPORT_DIR, 'tsan')} halt_on_error=0`,
    },
    runtimePrefix: 'libclang_rt.tsan',
  },
  address: {
    buildArgs: [
      '-enableAddressSanitizer',
      'YES',
      'ENABLE_ADDRESS_SANITIZER=YES',
      '-enableUndefinedBehaviorSanitizer',
      'YES',
      'ENABLE_UNDEFINED_BEHAVIOR_SANITIZER=YES',
    ],
    launchEnv: {
      SIMCTL_CHILD_ASAN_OPTIONS: `log_path=${path.join(SANITIZER_REPORT_DIR, 'asan')}`,
      SIMCTL_CHILD_UBSAN_OPTIONS: `log_path=${path.join(SANITIZER_REPORT_DIR, 'ubsan')} print_stacktrace=1`,
    },
    runtimePrefix: 'libclang_rt.asan',
  },
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

const LIBRARY = String(args.library ?? '').toLowerCase();
const PLATFORM = String(args.platform ?? 'ios').toLowerCase();
const METRO_PORT = Number(args['metro-port'] ?? 8081);
const CONFIGURATION =
  typeof args.configuration === 'string'
    ? args.configuration
    : 'DebugRuntimeTests';
const IS_RELEASE = CONFIGURATION.startsWith('Release');
// Release builds have no Metro; the app then reports to port 8082.
const PORT = Number(args.port ?? (IS_RELEASE ? 8082 : METRO_PORT + 1));
const ONLY =
  typeof args.only === 'string'
    ? args.only
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
const CONNECT_TIMEOUT_MS = Number(args['connect-timeout'] ?? 600) * 1000;
const IDLE_TIMEOUT_MS = Number(args['idle-timeout'] ?? 600) * 1000;
const SHOULD_LAUNCH = args.launch === true || args.launch === '';
const BUILD_ONLY = args['build-only'] === true || args['build-only'] === '';
const SKIP_BUILD = args['skip-build'] === true || args['skip-build'] === '';
const SIMULATOR =
  typeof args.simulator === 'string' ? args.simulator : 'iPhone 17';
const UDID = typeof args.udid === 'string' ? args.udid : null;
const SERIAL = typeof args.serial === 'string' ? args.serial : null;
const AVD = typeof args.avd === 'string' ? args.avd : null;
const SANITIZER = args.sanitizer ? String(args.sanitizer).toLowerCase() : null;

if (!BUILD_ONLY && !LIBRARIES.includes(LIBRARY)) {
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

if (SANITIZER && !SANITIZERS[SANITIZER]) {
  console.error(
    `[runtime-tests] --sanitizer supports only: ${Object.keys(SANITIZERS).join(', ')}`
  );
  process.exit(1);
}

if (SANITIZER && PLATFORM !== 'ios') {
  console.error('[runtime-tests] --sanitizer is only supported on iOS');
  process.exit(1);
}

if (BUILD_ONLY && PLATFORM !== 'ios') {
  console.error('[runtime-tests] --build-only is only supported on iOS');
  process.exit(1);
}

if (BUILD_ONLY && SHOULD_LAUNCH) {
  console.error(
    '[runtime-tests] --build-only cannot be combined with --launch'
  );
  process.exit(1);
}

/** @typedef {{ type?: string; [key: string]: any }} DeviceMessage */

/** @type {import('ws').WebSocket | null} */
let client = null;
let runStartedAt = 0;
let exitCode = 1;
let runFinished = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let connectTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let idleTimer = null;
/** @type {import('child_process').ChildProcess | null} */
let metroChild = null;

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

wss.on('error', (error) => {
  if (/** @type {{ code?: string }} */ (error).code === 'EADDRINUSE') {
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

if (!SHOULD_LAUNCH && !BUILD_ONLY) {
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
      console.warn(
        '[runtime-tests] failed to parse message:',
        errorMessage(error)
      );
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

/** @param {DeviceMessage} msg */
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

/** @param {DeviceMessage} msg */
function onHello(msg) {
  /** @type {{ name: string }[]} */
  const suites = msg.suites ?? [];
  const declared = suites.map((s) => s.name);
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

  const unknown = (ONLY ?? []).filter((name) => !declared.includes(name));
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
  });
  console.log('[runtime-tests] start sent, running tests…');
}

/** @param {DeviceMessage} msg */
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

/** @param {DeviceMessage} msg */
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

/** @param {DeviceMessage} msg */
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

/** @param {Record<string, unknown>} payload */
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

/** @param {'connect' | 'idle'} which */
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

function printSanitizerReports() {
  if (!SANITIZER || BUILD_ONLY) {
    return;
  }
  let files = [];
  try {
    files = fs.readdirSync(SANITIZER_REPORT_DIR);
  } catch {
    return;
  }
  if (files.length === 0) {
    console.log('[runtime-tests] no sanitizer reports were produced');
    return;
  }
  // Reports accumulate across the runs of a session and are printed by the
  // step that fails on them, so only point at them here.
  console.error(
    `[runtime-tests] ${files.length} sanitizer report file(s) in ${SANITIZER_REPORT_DIR}: ${files.join(', ')}`
  );
}

/** @param {number} code */
function shutdown(code) {
  printSanitizerReports();
  clearTimer('connect');
  clearTimer('idle');
  if (metroChild && !metroChild.killed && metroChild.pid !== undefined) {
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

/**
 * @param {string} cmd
 * @param {string[]} cmdArgs
 * @param {import('child_process').ExecFileOptions} [options]
 * @returns {Promise<{ stdout: string; stderr: string }>}
 */
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

/**
 * @param {string} host
 * @param {number} port
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
function probeTcp(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    /** @param {boolean} result */
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

/**
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
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
  metroChild.stdout?.on('data', (chunk) => {
    process.stdout.write(`[metro] ${chunk}`);
  });
  metroChild.stderr?.on('data', (chunk) => {
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

/** @param {{ name: string; udid: string; state: string }} device */
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

function sanitizerBuildArgs() {
  return SANITIZER ? SANITIZERS[SANITIZER].buildArgs : [];
}

async function buildApp() {
  console.log(
    `[runtime-tests] building with xcodebuild (${CONFIGURATION}${SANITIZER ? `, ${SANITIZER} sanitizer` : ''})… this can take a few minutes`
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
      ...sanitizerBuildArgs(),
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
      ...sanitizerBuildArgs(),
      '-showBuildSettings',
      '-json',
    ],
    { cwd: iosDir }
  );
  /** @type {{ buildSettings?: Record<string, string> }[]} */
  const entries = JSON.parse(stdout.slice(stdout.indexOf('[')));
  const entry =
    entries.find(
      (candidate) =>
        candidate.buildSettings?.WRAPPER_NAME === 'FabricExample.app'
    ) ?? entries[0];

  if (!entry?.buildSettings) {
    throw new Error(`No build settings for configuration ${CONFIGURATION}`);
  }

  const { TARGET_BUILD_DIR, WRAPPER_NAME } = entry.buildSettings;
  return path.join(TARGET_BUILD_DIR, WRAPPER_NAME);
}

/** @param {string} udid */
async function installAndLaunch(udid) {
  const app = await appPath();
  if (SANITIZER) {
    assertSanitizerRuntimeEmbedded(app);
  }
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
    `127.0.0.1:${METRO_PORT}`,
  ]);

  await run('xcrun', ['simctl', 'terminate', udid, BUNDLE_ID]).catch(() => {});
  if (SANITIZER) {
    if (!SKIP_BUILD) {
      fs.rmSync(SANITIZER_REPORT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(SANITIZER_REPORT_DIR, { recursive: true });
  }
  console.log(
    `[runtime-tests] launching ${BUNDLE_ID} with RUNTIME_TESTS_LIBRARY=${LIBRARY}`
  );
  await run('xcrun', ['simctl', 'launch', udid, BUNDLE_ID], {
    env: {
      ...process.env,
      SIMCTL_CHILD_RUNTIME_TESTS_LIBRARY: LIBRARY,
      ...(SANITIZER ? SANITIZERS[SANITIZER].launchEnv : {}),
    },
  });
}

/**
 * @param {string} dir
 * @param {string} name
 * @returns {string}
 */
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

/**
 * @param {string} serial
 * @param {string[]} adbArgs
 * @param {import('child_process').ExecFileOptions} [options]
 * @returns {Promise<{ stdout: string; stderr: string }>}
 */
function adb(serial, adbArgs, options = {}) {
  return run(ADB, ['-s', serial, ...adbArgs], options);
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
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

/** @param {string} serial */
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

/** @param {string} serial */
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

  console.log(
    `[runtime-tests] launching ${ANDROID_APP_ID} with RUNTIME_TESTS_LIBRARY=${LIBRARY}`
  );
  await adb(serial, [
    'shell',
    'am',
    'start',
    // -S force-stops the app inside am, avoiding the race a separate
    // `am force-stop` loses against this launch. CLEAR_TASK|NEW_TASK then wipes
    // the recents task record so its extra-less base intent cannot be restored
    // instead of this launch (CLEAR_TASK is ignored without NEW_TASK).
    '-S',
    '-f',
    '0x10008000',
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
    printCommandFailure(error);
    shutdown(1);
  });
}

/** @param {Error & { stdout?: string; stderr?: string }} error */
function printCommandFailure(error) {
  console.error(`[runtime-tests] ${error.message}`);
  if (error.stdout) {
    console.error(String(error.stdout).slice(-20000));
  }
  if (error.stderr) {
    console.error(String(error.stderr).slice(-4000));
  }
}

/** @param {string} app */
function assertSanitizerRuntimeEmbedded(app) {
  if (!SANITIZER) {
    return;
  }

  const prefix = SANITIZERS[SANITIZER].runtimePrefix;
  const frameworks = path.join(app, 'Frameworks');
  const embedded =
    fs.existsSync(frameworks) &&
    fs.readdirSync(frameworks).some((name) => name.startsWith(prefix));
  if (!embedded) {
    throw new Error(
      `the ${SANITIZER} sanitizer runtime (${prefix}*) is not embedded in ${app} — the build was not instrumented`
    );
  }
  console.log(
    `[runtime-tests] ${SANITIZER} sanitizer runtime is embedded in the app`
  );
}

if (BUILD_ONLY) {
  (async () => {
    if (SANITIZER) {
      fs.rmSync(SANITIZER_REPORT_DIR, { recursive: true, force: true });
    }
    await buildApp();
    if (SANITIZER) {
      assertSanitizerRuntimeEmbedded(await appPath());
    }
    shutdown(0);
  })().catch((error) => {
    printCommandFailure(error);
    shutdown(1);
  });
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

function printUsage() {
  console.log(`Usage: yarn runtime-tests --library <${LIBRARIES.join('|')}> [options]

Builds the runtime tests app, installs it, runs the requested library's test
suites and reports the results. \`yarn runtime-tests\` implies --launch;
\`yarn runtime-tests:server\` waits for you to start the app yourself.

Required
  --library <name>          One of: ${LIBRARIES.join(', ')}.

Target
  --platform <name>         One of: ${PLATFORMS.join(', ')}. Default: ios.
  --simulator <name>        iOS simulator to boot. Default: iPhone 17.
  --udid <udid>             iOS simulator to reuse, instead of --simulator.
  --serial <serial>         Android device already running (see \`adb devices\`).
  --avd <name>              Android AVD to boot when no --serial is given.

Build and run
  --configuration <name>    Xcode configuration / Gradle build type.
                            Default: DebugRuntimeTests. Release builds embed
                            the bundle and run without Metro.
  --skip-build              Reuse the installed app. Only safe when nothing
                            native changed - JS is served by Metro.
  --launch                  Launch the app after installing it.
  --only <a,b>              Comma separated suite names to run. Suite names come
                            from the library's suites.ts, for example
                            "run loop" or "runtimes,memory".

Ports and timeouts
  --metro-port <port>       Default: 8081.
  --port <port>             Reporting WebSocket. Default: --metro-port + 1,
                            or 8082 for Release builds.
  --connect-timeout <secs>  Wait for the app to connect. Default: 600.
  --idle-timeout <secs>     Give up after this much silence. Default: 600.

  --help                    Show this message.`);
}

/**
 * @param {string[]} argv
 * @returns {Record<string, string | true>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string | true>} */
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
