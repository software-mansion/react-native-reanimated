#!/usr/bin/env node

// Drive the iOS runtime tests against a REMOTE simulator (argent cloud).
//
// Runs from any OS that has node + the `sim-remote` CLI (authenticated via
// SIM_ROUTER_USERNAME / SIM_ROUTER_API_KEY) — no Xcode, no xcrun, no macOS.
//
// The reporting path is unchanged from local runs: runtime-tests-server.js
// listens on this host, and `sim-remote proxy` reverse-tunnels the sim's
// localhost:<port> here, so the app's WebSocket dial arrives at this
// machine. The library is selected via launchd env inside the remote sim
// (`sim-remote setenv`), the remote analogue of SIMCTL_CHILD_*.
//
// Debug* configurations are supported: the app loads its JS from a Metro
// server on THIS host at launch. `run` then starts (or reuses) Metro on
// --metro-port, opens a second reverse tunnel for it, and points the app at
// it via RCT_jsLocation. The reporting port becomes metro-port + 1 — that is
// how Debug apps derive it from their Metro URL.
//
// Usage:
//   node runtime-tests-remote.mjs pick    [--udid <UUID>]
//   node runtime-tests-remote.mjs install --udid <UUID> --app-path <path/to/FabricExample.app>
//   node runtime-tests-remote.mjs run     --udid <UUID> --library <reanimated|worklets|self-tests>
//                                         [--configuration ReleaseRuntimeTests] [--only "<suites>"]
//                                         [--metro-port <port>]
//                                         [--connect-timeout <secs>] [--idle-timeout <secs>]
//
// `pick` prints the UDID of the best remote simulator (an explicit --udid
// passes through; otherwise the first available iPhone, preferring booted);
// `install` boots the sim and uploads the app (once per job);
// `run` executes one library's suites (once per workflow step, like --launch).

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const BUNDLE_ID = 'org.reactjs.native.example.FabricExample';
const projectRoot = path.resolve(scriptDir, '..');
const SERVER_SCRIPT = path.join(scriptDir, 'runtime-tests-server.js');
const METRO_LOG = path.join(os.tmpdir(), 'metro-runtime-tests.log');

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(`[runtime-tests-remote] ${message}`);
  process.exit(1);
}

/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/** @param {string} message */
function log(message) {
  console.log(`[runtime-tests-remote] ${message}`);
}

// ── argument parsing ──

const [SUBCOMMAND, ...rest] = process.argv.slice(2);
/** @type {Record<string, string>} */
const args = {};
for (let i = 0; i < rest.length; i++) {
  const flag = rest[i];
  if (!flag.startsWith('--') || rest[i + 1] === undefined) {
    fail(`unknown or valueless flag: ${flag} (see the usage header)`);
  }
  args[flag.slice(2)] = rest[++i];
}

const UDID = args.udid ? args.udid.replace(/^remote:/, '') : '';
const APP_PATH = args['app-path'] ?? '';
const LIBRARY = args.library ?? '';
const CONFIGURATION = args.configuration ?? 'ReleaseRuntimeTests';
const ONLY = args.only ?? '';

/**
 * @param {string} name
 * @param {string | number} value
 */
function positiveInt(name, value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    fail(`--${name} must be a positive integer, got: ${value}`);
  }

  return parsed;
}

const METRO_PORT = positiveInt('metro-port', args['metro-port'] ?? 8081);
const CONNECT_TIMEOUT = positiveInt(
  'connect-timeout',
  args['connect-timeout'] ?? 900
);
const IDLE_TIMEOUT = positiveInt('idle-timeout', args['idle-timeout'] ?? 900);

// ── process helpers ──

/**
 * @param {string} command
 * @param {string[]} cmdArgs
 * @param {import('node:child_process').ExecFileOptions} [options]
 * @returns {Promise<{ stdout: string; stderr: string }>}
 */
function run(command, cmdArgs, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      cmdArgs,
      { maxBuffer: 16 * 1024 * 1024, timeout: 120_000, ...options },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `${command} ${cmdArgs.join(' ')} failed: ${String(stderr || error.message).trim()}`
            )
          );
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}

/**
 * @param {string[]} cmdArgs
 * @param {import('node:child_process').ExecFileOptions} [options]
 */
const simRemote = (cmdArgs, options) => run('sim-remote', cmdArgs, options);

function assertSimRemote() {
  try {
    execFileSync('sim-remote', ['--help'], { stdio: 'ignore' });
  } catch {
    fail('sim-remote CLI not found on PATH');
  }
}

// ── tunnels and Metro ──

// Reverse tunnel: the sim's localhost:<port> -> this host. `proxy start`
// errors with "tunnel already active" on re-runs — tolerate that (same
// semantics as argent's proxyStart wrapper) so runs can blindly ensure
// their tunnels exist.
/** @param {number} port */
async function ensureTunnel(port) {
  log(`ensuring reverse tunnel for port ${port}`);
  try {
    await simRemote(['proxy', 'start', UDID, String(port)]);
  } catch (error) {
    if (/already/i.test(errorMessage(error))) {
      log(`tunnel already active on port ${port}`);
      return;
    }
    throw error;
  }
}

function metroRunning() {
  return new Promise((resolve) => {
    const request = http.get(
      { host: '127.0.0.1', port: METRO_PORT, path: '/status', timeout: 2000 },
      (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () =>
          resolve(body.includes('packager-status:running'))
        );
      }
    );
    request.on('error', () => resolve(false));
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Start Metro on this host unless one is already serving. Mirrors the local
// runner: --reset-cache because a Metro cache built under a different Bundle
// Mode serves stale module maps. Left running on exit — later `run`
// invocations (and re-runs) reuse it; CI job teardown reaps it.
async function ensureMetro() {
  if (await metroRunning()) {
    log(`Metro already running on :${METRO_PORT}, reusing it`);
    return;
  }
  log(`starting Metro on :${METRO_PORT} (log: ${METRO_LOG})`);
  const logFd = fs.openSync(METRO_LOG, 'a');
  const metro = spawn(
    'yarn',
    ['start', '--port', String(METRO_PORT), '--reset-cache'],
    { cwd: projectRoot, detached: true, stdio: ['ignore', logFd, logFd] }
  );
  metro.unref();
  for (let attempt = 0; attempt < 90; attempt++) {
    await sleep(2000);
    if (await metroRunning()) {
      log('Metro is ready');
      return;
    }
  }
  fail(`Metro did not become ready within 180s (see ${METRO_LOG})`);
}

// ── subcommands ──

async function pick() {
  // stdout carries ONLY the udid — logs would pollute $(...) captures.
  if (UDID) {
    console.log(UDID);
    return;
  }
  const { stdout } = await simRemote(['simctl', 'list', 'devices', '--json']);
  const devices = Object.values(JSON.parse(stdout).devices).flat();
  const candidates = devices
    .filter((device) => device.isAvailable !== false)
    .filter((device) => device.name.startsWith('iPhone'))
    .sort(
      (a, b) => (a.state === 'Booted' ? 0 : 1) - (b.state === 'Booted' ? 0 : 1)
    );
  if (candidates.length === 0) {
    fail('no available remote iPhone simulator found');
  }
  console.log(candidates[0].udid);
}

async function install() {
  if (!UDID) fail('--udid is required (bare UUID or remote:<UUID>)');
  if (!APP_PATH) fail('install requires --app-path');
  if (!fs.existsSync(APP_PATH)) {
    fail(`no .app at ${APP_PATH} (unpack the artifact first)`);
  }
  log(`booting remote simulator ${UDID}`);
  await simRemote(['simctl', 'boot', UDID]).catch(() => {}); // tolerate already-booted
  await simRemote(['simctl', 'bootstatus', UDID, '-b'], { timeout: 300_000 });
  log(`uploading ${APP_PATH} to the orchestrator (QUIC)`);
  await simRemote(['simctl', 'uninstall', UDID, BUNDLE_ID]).catch(() => {});
  await simRemote(['simctl', 'install', UDID, path.resolve(APP_PATH)], {
    timeout: 300_000,
  });
  log('install done');
}

async function runLibrary() {
  if (!UDID) fail('--udid is required (bare UUID or remote:<UUID>)');
  if (!LIBRARY) fail('run requires --library');
  const isRelease = /^Release/.test(CONFIGURATION);
  if (!isRelease && !/^Debug/.test(CONFIGURATION)) {
    fail(`unknown configuration: ${CONFIGURATION} (expected Debug*|Release*)`);
  }

  // Debug apps load their JS from Metro at launch and derive their
  // reporting WebSocket port as metro-port + 1 (from the Metro URL).
  let wsPort = 8082;
  if (!isRelease) {
    wsPort = METRO_PORT + 1;
    await ensureMetro();
    await ensureTunnel(METRO_PORT);
    // Explicitly point the app at this Metro (inside the sim, localhost
    // means the remote Mac — the tunnel makes this address land here).
    await simRemote([
      'spawn',
      UDID,
      '--',
      'defaults',
      'write',
      BUNDLE_ID,
      'RCT_jsLocation',
      `127.0.0.1:${METRO_PORT}`,
    ]);
  }
  await ensureTunnel(wsPort);

  log(`selecting library '${LIBRARY}' via launchd env`);
  await simRemote(['setenv', UDID, 'RUNTIME_TESTS_LIBRARY', LIBRARY]);

  // Start the results collector BEFORE launching the app so the first dial
  // cannot race the listener. Server mode: no --launch, the device is ours.
  const serverArgs = [
    SERVER_SCRIPT,
    '--library',
    LIBRARY,
    '--platform',
    'ios',
    '--configuration',
    CONFIGURATION,
    '--port',
    String(wsPort),
    '--connect-timeout',
    String(CONNECT_TIMEOUT),
    '--idle-timeout',
    String(IDLE_TIMEOUT),
  ];
  if (ONLY) {
    serverArgs.push('--only', ONLY);
  }

  const server = spawn('node', serverArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  /** @type {('SIGINT' | 'SIGTERM')[]} */
  const signals = ['SIGINT', 'SIGTERM'];

  for (const signal of signals) {
    process.once(signal, () => {
      server.kill(signal);
      process.exit(1);
    });
  }

  const serverExit = new Promise((resolve) => {
    server.on('exit', (code) => resolve(code ?? 1));
  });

  log(`launching ${BUNDLE_ID} (library: ${LIBRARY})`);
  await simRemote(['simctl', 'terminate', UDID, BUNDLE_ID]).catch(() => {});
  try {
    await simRemote(['simctl', 'launch', UDID, BUNDLE_ID]);
  } catch (error) {
    // Don't leave the collector hanging for the full connect timeout.
    server.kill();
    fail(`launch failed: ${errorMessage(error)}`);
  }

  const exitCode = await serverExit;
  log(`library '${LIBRARY}' finished with exit code ${exitCode}`);
  process.exit(exitCode);
}

// ── dispatch ──

/** @type {Record<string, () => Promise<void>>} */
const subcommands = { pick, install, run: runLibrary };
if (!subcommands[SUBCOMMAND]) {
  fail(
    `unknown subcommand: ${SUBCOMMAND ?? '(none)'} (expected pick | install | run)`
  );
}
assertSimRemote();
subcommands[SUBCOMMAND]().catch((error) => {
  fail(errorMessage(error));
});
