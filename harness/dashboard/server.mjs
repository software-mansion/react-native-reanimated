import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const options = parseOptions(process.argv.slice(2));
const buildDirectory = resolve(options.build ?? 'build/layout-animation-harness');
const traceDirectory = mkdtempSync(join(tmpdir(), 'layout-animation-dashboard-'));
const port = Number(options.port ?? 4173);
const binaries = [
  { platform: 'ios', path: join(buildDirectory, 'harness_ios_tests') },
  { platform: 'android', path: join(buildDirectory, 'harness_android_tests') },
];
let tests = listTests();
let running = false;

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === 'GET' && url.pathname === '/api/tests') {
      return json(response, 200, { buildDirectory, tests });
    }
    if (request.method === 'POST' && url.pathname === '/api/build') {
      return json(response, 200, buildHarness());
    }
    if (request.method === 'POST' && url.pathname === '/api/run') {
      if (running) {
        return json(response, 409, { error: 'A test run is already active' });
      }
      const body = await readBody(request);
      const selected = Array.isArray(body.tests) && body.tests.length > 0
          ? body.tests.map((id) => tests.find((test) => test.id === id)).filter(Boolean)
          : tests;
      running = true;
      try {
        const results = [];
        for (const test of selected) {
          results.push(await runTest(test));
        }
        return json(response, 200, { results });
      } finally {
        running = false;
      }
    }
    if (request.method === 'GET') {
      return serveStatic(url.pathname, response);
    }
    return json(response, 404, { error: 'Not found' });
  } catch (error) {
    return json(response, 500, { error: error.message });
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Layout animation dashboard: http://127.0.0.1:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    rmSync(traceDirectory, { recursive: true, force: true });
    server.close(() => process.exit(0));
  });
}

function listTests() {
  const discovered = [];
  for (const binary of binaries) {
    if (!existsSync(binary.path)) {
      continue;
    }
    const result = spawnSync(binary.path, ['--gtest_list_tests', '--gtest_color=no'], { encoding: 'utf8' });
    if (result.status !== 0) {
      continue;
    }
    let suite = '';
    for (const line of result.stdout.split('\n')) {
      if (!line.startsWith(' ') && line.trim().endsWith('.')) {
        suite = line.trim();
      } else if (suite && line.startsWith('  ')) {
        const name = line.trim().split(/s+#/)[0];
        const filter = `${suite}${name}`;
        discovered.push({
          id: `${binary.platform}.${filter}`,
          platform: binary.platform,
          suite: suite.slice(0, -1),
          name,
          filter,
          binary: binary.path,
        });
      }
    }
  }
  return discovered;
}

function buildHarness() {
  const result = spawnSync(
      'cmake',
      ['--build', buildDirectory, '--target', 'harness_ios_tests', 'harness_android_tests', '--parallel', '8'],
      { encoding: 'utf8' });
  if (result.status === 0) {
    tests = listTests();
  }
  return {
    passed: result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join('\n'),
    tests,
  };
}

function runTest(test) {
  return new Promise((resolveRun) => {
    const trace = join(traceDirectory, `${test.id.replaceAll(/[^a-zA-Z0-9.-]/g, '_')}.ndjson`);
    writeFileSync(trace, '');
    const started = performance.now();
    const child = spawn(test.binary, [
      `--gtest_filter=${test.filter}`,
      '--gtest_color=no',
    ], {
      env: { ...process.env, LA_HARNESS_TRACE_FILE: trace },
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 120_000);
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      resolveRun({
        id: test.id,
        passed: code === 0,
        duration: Math.round(performance.now() - started),
        output,
        signal,
        runs: readTrace(trace),
      });
    });
  });
}

function readTrace(path) {
  return readFileSync(path, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
}

function serveStatic(pathname, response) {
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const path = resolve(directory, requested);
  if (!path.startsWith(`${directory}/`) || !existsSync(path)) {
    return json(response, 404, { error: 'Not found' });
  }
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  };
  response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(response);
}

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function parseOptions(arguments_) {
  const parsed = {};
  for (let index = 0; index < arguments_.length; ++index) {
    const name = arguments_[index];
    if ((name === '--build' || name === '--port') && arguments_[index + 1]) {
      parsed[name.slice(2)] = arguments_[++index];
    } else {
      throw new Error(`Unknown option: ${name}`);
    }
  }
  return parsed;
}
