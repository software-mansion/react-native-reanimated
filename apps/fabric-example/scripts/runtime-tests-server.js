#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Host-side WebSocket server for the iOS DebugRuntimeTests scheme.
 *
 * Usage:
 *   node scripts/runtime-tests-server.js [--launch] [--port 8082] [--only foo,bar]
 *                                        [--simulator "iPhone 17"]
 *                                        [--connect-timeout 600] [--idle-timeout 600]
 *
 *   --launch          Also spawn `yarn ios --mode DebugRuntimeTests` after the
 *                     server is listening. Without it, the server just waits.
 *   --only            Comma-separated suite filter forwarded in the `start`
 *                     envelope.
 *   --port            Port to listen on. Defaults to 8082.
 *   --simulator       Simulator name forwarded to `react-native run-ios` when
 *                     `--launch` is set. Defaults to "iPhone 17".
 *   --connect-timeout Seconds to wait for the first client. Default 600.
 *   --idle-timeout    Seconds without any message before aborting. Default 600.
 */

const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.WebSocketServer || WebSocket.Server;

const args = parseArgs(process.argv.slice(2));
const PORT = Number(args.port ?? 8082);
const ONLY = args.only ? args.only.split(',').map((s) => s.trim()).filter(Boolean) : null;
const CONNECT_TIMEOUT_MS = Number(args['connect-timeout'] ?? 600) * 1000;
const IDLE_TIMEOUT_MS = Number(args['idle-timeout'] ?? 600) * 1000;
const SHOULD_LAUNCH = args.launch === true || args.launch === '';
const SIMULATOR = args.simulator ?? 'iPhone 17';

const projectRoot = path.resolve(__dirname, '..');

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });
let client = null;
let runStartedAt = 0;
let exitCode = 1;
let runFinished = false;
let connectTimer = null;
let idleTimer = null;
let launchChild = null;

console.log(`[runtime-tests] listening on ws://0.0.0.0:${PORT}`);
if (ONLY) {
  console.log(`[runtime-tests] suite filter: ${ONLY.join(', ')}`);
}

connectTimer = setTimeout(() => {
  console.error(
    `[runtime-tests] no device connected within ${CONNECT_TIMEOUT_MS / 1000}s, exiting`
  );
  shutdown(1);
}, CONNECT_TIMEOUT_MS);

wss.on('connection', (socket) => {
  if (client) {
    console.warn('[runtime-tests] rejecting extra client; one already connected');
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
  console.log(
    `[runtime-tests] hello from ${msg.platform} ${msg.platformVersion}, ${declared.length} suites declared`
  );

  if (ONLY) {
    const unknown = ONLY.filter((name) => !declared.includes(name));
    if (unknown.length > 0) {
      console.error(`[runtime-tests] unknown suite name(s): ${unknown.join(', ')}`);
      console.error(`[runtime-tests] available suites: ${declared.join(', ')}`);
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
  const args = Array.isArray(msg.args) ? msg.args : [];
  const line = args.join(' ');
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
  console.log(`[runtime-tests] Run finished in ${elapsed}s`);
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
  if (launchChild && !launchChild.killed) {
    try {
      launchChild.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  wss.close(() => {
    process.exit(code);
  });
  setTimeout(() => process.exit(code), 1000).unref();
}

if (SHOULD_LAUNCH) {
  const launchArgs = [
    'ios',
    '--scheme',
    'DebugRuntimeTests',
    '--mode',
    'DebugRuntimeTests',
    '--simulator',
    SIMULATOR,
  ];
  console.log(
    `[runtime-tests] launching iOS app: yarn ${launchArgs
      .map((a) => (a.includes(' ') ? `"${a}"` : a))
      .join(' ')}`
  );
  launchChild = spawn('yarn', launchArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  launchChild.on('exit', (code) => {
    if (code !== 0 && !client) {
      console.error(`[runtime-tests] yarn ios exited with code ${code}, aborting`);
      shutdown(code ?? 1);
    }
  });
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
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
