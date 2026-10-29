import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

const SCRIPT_PATH = path.resolve(
  import.meta.dirname,
  '..',
  'runtime-tests-server.js'
);

const XCODEBUILD_STUB = `#!/usr/bin/env node
const fs = require('fs');
const net = require('net');
const socket = net.connect(Number(process.env.STUB_PORT), '127.0.0.1');
const record = (state) => {
  fs.appendFileSync(process.env.STUB_RESULT, state + '\\n');
  socket.destroy();
};
socket.on('connect', () => record('bound'));
socket.on('error', () => record('free'));
`;

describe('runtime-tests-server --build-only', () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-'));
  after(() => fs.rmSync(workDir, { recursive: true, force: true }));

  it('does not open the reporter port', async () => {
    const binDir = path.join(workDir, 'bin');
    fs.mkdirSync(binDir);
    fs.writeFileSync(path.join(binDir, 'xcodebuild'), XCODEBUILD_STUB, {
      mode: 0o755,
    });
    const resultFile = path.join(workDir, 'result');
    const port = await findFreePort();

    const { code, output } = await runServer(
      [
        '--build-only',
        '--configuration',
        'ReleaseRuntimeTests',
        '--port',
        String(port),
      ],
      {
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
        STUB_PORT: String(port),
        STUB_RESULT: resultFile,
      }
    );

    assert.equal(code, 0, output);
    assert.equal(fs.readFileSync(resultFile, 'utf8'), 'free\n');
    assert.doesNotMatch(output, /listening on/);
  });
});

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

function runServer(
  args: string[],
  env: Record<string, string>
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, ...args], {
      env: { ...process.env, ...env },
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, output }));
  });
}
