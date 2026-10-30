import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(
  new URL(
    '../../apps/fabric-example/scripts/runtime-tests-server.js',
    import.meta.url
  ),
  'utf8'
);
const diagnostics = [
  between(
    'async function dumpAndroidCrashDiagnostics()',
    '\nasync function symbolizeNativeCrash('
  ),
  between(
    'function adbDiag(',
    '\n/** @returns {string | null} */\nfunction findNdkStack('
  ),
  between('function adb(', '\n/**\n * @param {number} ms'),
].join('\n');

test('server-only diagnostics use the explicit Android serial', async () => {
  await checkDevice(null, 'emulator-5554', 'emulator-5554');
});

test('launch diagnostics use the resolved Android serial', async () => {
  await checkDevice('emulator-5556', null, 'emulator-5556');
});

test('diagnostics do not select an unrequested Android device', async () => {
  await checkDevice(null, null, null);
});

async function checkDevice(
  androidSerial: string | null,
  serial: string | null,
  expected: string | null
) {
  const messages: string[] = [];
  const calls: string[][] = [];
  const collect = vm.runInNewContext(
    `${diagnostics}\ndumpAndroidCrashDiagnostics`,
    {
      androidSerial,
      SERIAL: serial,
      console: { error: (message: string) => messages.push(message) },
      fs: {
        mkdirSync: () => {},
        existsSync: () => false,
        readdirSync: () => [],
      },
      path,
      CRASH_REPORT_DIR: '',
      ADB: 'adb',
      sleep: async () => {},
      run: async (command: string, args: string[]) => {
        assert.equal(command, 'adb');
        calls.push(Array.from(args));
        return { stdout: '', stderr: '' };
      },
      listAndroidDevices: () => assert.fail('must not select another device'),
    }
  );
  await collect();
  if (expected) {
    assert.equal(
      messages[0],
      `[runtime-tests] collecting crash diagnostics from ${expected}…`
    );
    assert.ok(calls.length > 0);
    for (const args of calls) {
      assert.deepEqual(args.slice(0, 2), ['-s', expected]);
    }
    assert.ok(calls.some((args) => args[2] === 'logcat'));
    assert.ok(calls.some((args) => args[2] === 'root'));
    assert.ok(calls.some((args) => args[2] === 'pull'));
  } else {
    assert.equal(calls.length, 0);
    assert.deepEqual(messages, [
      '[runtime-tests] no selected Android device for crash diagnostics',
    ]);
  }
}

function between(startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, `Missing runtime-driver marker: ${startMarker}`);
  assert.ok(
    end > start,
    `Missing or misplaced runtime-driver marker: ${endMarker}`
  );
  return source.slice(start, end);
}
