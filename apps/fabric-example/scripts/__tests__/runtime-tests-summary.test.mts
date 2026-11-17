import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import WebSocket from 'ws';

const SERVER = path.resolve(
  import.meta.dirname,
  '..',
  'runtime-tests-server.mts'
);

describe('runtime-tests GitHub failure summary', () => {
  let workDir = '';

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('annotates every failed test and writes the job summary', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    const result = await runServerWithDevice(summaryFile, {
      type: 'done',
      passed: 2,
      failed: 2,
      skipped: 1,
      failedTests: ['reports a mismatch', 'throws in a worklet'],
      failures: [
        {
          suite: 'withTiming › mocked timer',
          name: 'reports a mismatch',
          errors: ['Expected \x1b[92m0\x1b[0m received \x1b[91m5\x1b[0m'],
        },
        {
          suite: 'threads',
          name: 'throws in a worklet',
          errors: [
            '[uncaught] Error: Value is null, expected an Object\n    at _updateProps (native)',
          ],
        },
      ],
      durationMs: 10,
    });

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.equal(
      result.annotations,
      [
        '::error title=self-tests runtime tests on ios (DebugRuntimeTests)::withTiming › mocked timer › reports a mismatch%0AExpected 0 received 5',
        '::error title=self-tests runtime tests on ios (DebugRuntimeTests)::threads › throws in a worklet%0A[uncaught] Error: Value is null, expected an Object',
      ].join('\n')
    );
    assert.equal(
      fs.readFileSync(summaryFile, 'utf8'),
      [
        '### ❌ self-tests runtime tests on ios (DebugRuntimeTests): 2 failed, 2 passed, 1 skipped',
        '',
        '- **withTiming › mocked timer › reports a mismatch**',
        '',
        '  ```',
        '  Expected 0 received 5',
        '  ```',
        '',
        '- **threads › throws in a worklet**',
        '',
        '  ```',
        '  [uncaught] Error: Value is null, expected an Object',
        '      at _updateProps (native)',
        '  ```',
        '',
        '',
        '',
      ].join('\n')
    );
    assert.match(
      result.stdout,
      /\[runtime-tests\] Failed tests:\n {2}• withTiming › mocked timer › reports a mismatch\n {6}Expected 0 received 5\n/
    );
  });

  it('caps annotations at ten and points at the job summary', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    const failures = Array.from({ length: 12 }, (_, index) => ({
      suite: 'suite',
      name: `test ${index}`,
      errors: [],
    }));
    const result = await runServerWithDevice(summaryFile, {
      type: 'done',
      passed: 0,
      failed: failures.length,
      skipped: 0,
      failedTests: failures.map((failure) => failure.name),
      failures,
      durationMs: 10,
    });

    const annotations = result.annotations.split('\n');
    assert.equal(annotations.length, 10);
    assert.equal(
      annotations[8],
      '::error title=self-tests runtime tests on ios (DebugRuntimeTests)::suite › test 8'
    );
    assert.equal(
      annotations[9],
      '::error title=self-tests runtime tests on ios (DebugRuntimeTests)::3 more failed test(s), see the job summary'
    );
    assert.equal(
      (fs.readFileSync(summaryFile, 'utf8').match(/^- \*\*suite › /gm) ?? [])
        .length,
      12
    );
  });

  it('writes a one-line job summary for a green run', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    const result = await runServerWithDevice(summaryFile, {
      type: 'done',
      passed: 3,
      failed: 0,
      skipped: 1,
      failedTests: [],
      failures: [],
      durationMs: 10,
    });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.annotations, '');
    assert.equal(
      fs.readFileSync(summaryFile, 'utf8'),
      '### ✅ self-tests runtime tests on ios (DebugRuntimeTests): 0 failed, 3 passed, 1 skipped\n\n'
    );
  });

  it('stays silent with RUNTIME_TESTS_CI_REPORT=0', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    const result = await runServerWithDevice(
      summaryFile,
      {
        type: 'done',
        passed: 0,
        failed: 1,
        skipped: 0,
        failedTests: ['fails on purpose'],
        failures: [
          {
            suite: 'intentional failures',
            name: 'fails on purpose',
            errors: [],
          },
        ],
        durationMs: 10,
      },
      { RUNTIME_TESTS_CI_REPORT: '0' }
    );

    assert.equal(result.status, 1);
    assert.equal(result.annotations, '');
    assert.equal(fs.existsSync(summaryFile), false);
    assert.match(result.stdout, /• intentional failures › fails on purpose/);
  });

  it('does not repeat pre-reload failures of a device without failure details', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    const result = await runServerWithDevice(
      summaryFile,
      {
        type: 'done',
        passed: 0,
        failed: 1,
        skipped: 0,
        failedTests: ['after reload'],
        durationMs: 10,
      },
      {},
      {
        type: 'reload',
        resumeFromSuite: 'second',
        passed: 1,
        failed: 1,
        skipped: 0,
        failedTests: ['before reload'],
        durationMs: 10,
      }
    );

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.equal(
      result.annotations,
      [
        '::error title=self-tests runtime tests on ios (DebugRuntimeTests)::before reload',
        '::error title=self-tests runtime tests on ios (DebugRuntimeTests)::after reload',
      ].join('\n')
    );
    assert.match(
      result.stdout,
      /\[runtime-tests\] passed: 1, failed: 2, skipped: 0\n/
    );
  });

  it('uses a fence longer than any backtick run in the error text', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    await runServerWithDevice(summaryFile, {
      type: 'done',
      passed: 0,
      failed: 1,
      skipped: 0,
      failedTests: ['prints fences'],
      failures: [
        {
          suite: 'markdown',
          name: 'prints fences',
          errors: ['Expected\n```\nreceived\n````'],
        },
      ],
      durationMs: 10,
    });

    assert.equal(
      fs.readFileSync(summaryFile, 'utf8'),
      [
        '### ❌ self-tests runtime tests on ios (DebugRuntimeTests): 1 failed, 0 passed, 0 skipped',
        '',
        '- **markdown › prints fences**',
        '',
        '  `````',
        '  Expected',
        '  ```',
        '  received',
        '  ````',
        '  `````',
        '',
        '',
        '',
      ].join('\n')
    );
  });

  it('keeps the job summary under the 1 MiB limit', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    fs.writeFileSync(summaryFile, 'x'.repeat(1024 * 1024 - 400));
    const failures = Array.from({ length: 5 }, (_, index) => ({
      suite: 'suite',
      name: `test ${index}`,
      errors: ['e'.repeat(100)],
    }));
    await runServerWithDevice(summaryFile, {
      type: 'done',
      passed: 0,
      failed: failures.length,
      skipped: 0,
      failedTests: failures.map((failure) => failure.name),
      failures,
      durationMs: 10,
    });

    const summary = fs.readFileSync(summaryFile);
    assert.ok(
      summary.length <= 1024 * 1024,
      `summary is ${summary.length} bytes`
    );
    const appended = summary.toString('utf8').slice(1024 * 1024 - 400);
    assert.match(appended, /^### ❌ /);
    assert.match(appended, /- \*\*suite › test 0\*\*/);
    assert.match(
      appended,
      /_\d more failed test\(s\) not shown, see the log\._\n\n$/
    );
    assert.doesNotMatch(appended, /test 4/);
  });

  it('skips the job summary when the file is already full', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    const full = 'x'.repeat(1024 * 1024 - 20);
    fs.writeFileSync(summaryFile, full);
    const result = await runServerWithDevice(summaryFile, {
      type: 'done',
      passed: 0,
      failed: 1,
      skipped: 0,
      failedTests: ['fails'],
      failures: [{ suite: 'suite', name: 'fails', errors: [] }],
      durationMs: 10,
    });

    assert.equal(fs.readFileSync(summaryFile, 'utf8'), full);
    assert.match(result.stderr, /the job summary is full/);
    assert.match(result.annotations, /suite › fails$/);
  });

  it('annotates a device error', async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-summary-'));
    const summaryFile = path.join(workDir, 'summary.md');
    const result = await runServerWithDevice(summaryFile, {
      type: 'error',
      message: 'Unknown test suites: nope',
    });

    assert.equal(result.status, 1);
    assert.equal(
      result.annotations,
      '::error title=self-tests runtime tests on ios (DebugRuntimeTests)::The app reported an error instead of finishing the run: Unknown test suites: nope'
    );
    assert.equal(fs.existsSync(summaryFile), false);
  });
});

async function runServerWithDevice(
  summaryFile: string,
  finalMessage: Record<string, unknown>,
  env: Record<string, string> = {},
  reloadMessage?: Record<string, unknown>
) {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    [
      '--experimental-strip-types',
      SERVER,
      '--library',
      'self-tests',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--connect-timeout',
      '10',
    ],
    {
      env: {
        ...process.env,
        GITHUB_ACTIONS: 'true',
        GITHUB_STEP_SUMMARY: summaryFile,
        ...env,
      },
    }
  );
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  await waitForOutput(() => stdout.includes('listening on'), child);

  let socket = await connectDevice(port);
  if (reloadMessage) {
    socket.send(JSON.stringify(reloadMessage));
    await waitForMessage(socket, 'reloadAccepted');
    socket.close();
    await waitForOutput(
      () => stdout.includes('waiting for it to reconnect'),
      child
    );
    socket = await connectDevice(port);
  }
  socket.send(JSON.stringify(finalMessage));

  const status = await new Promise<number | null>((resolve) => {
    child.once('close', (code) => resolve(code));
  });
  socket.close();
  const annotations = stdout
    .split('\n')
    .filter((line) => line.startsWith('::error'))
    .join('\n');
  return { status, stdout, stderr, annotations };
}

async function connectDevice(port: number) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });
  socket.send(
    JSON.stringify({
      type: 'hello',
      platform: 'ios',
      platformVersion: '26.0',
      library: 'self-tests',
      suites: [{ name: 'first' }, { name: 'second' }],
    })
  );
  await waitForMessage(socket, 'start');
  return socket;
}

function waitForMessage(socket: WebSocket, type: string) {
  return new Promise<void>((resolve) => {
    socket.on('message', (data) => {
      if (JSON.parse(data.toString()).type === type) {
        resolve();
      }
    });
  });
}

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitForOutput(ready: () => boolean, child: ChildProcess) {
  const startedAt = Date.now();
  while (!ready()) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}`);
    }
    if (Date.now() - startedAt > 10_000) {
      throw new Error('server did not start listening in time');
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
