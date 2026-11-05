import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

const SCRIPTS = path.resolve(import.meta.dirname, '..');
const NODE_MODULES = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'node_modules'
);
const SELECTED = 'emulator-5554';
const HUMAN_PHONE = '5A061JEBF05931';
const LAUNCH = ['--launch', '--configuration', 'ReleaseRuntimeTests'];

const FAKE_ADB = `#!/bin/sh
echo "$*" >> "$FAKE_LOG"
if [ "$1" = devices ]; then
  echo 'List of devices attached'
  for device in $FAKE_DEVICES; do printf '%s\\t%s\\n' "\${device%:*}" "\${device#*:}"; done
  exit 0
fi
if [ "$1" != -s ]; then
  echo 'error: more than one device/emulator' >&2
  exit 1
fi
serial=$2
shift 2
case "$*" in
  'logcat -b crash -d') echo 'F libc: Fatal signal 11 (SIGSEGV)' ;;
  root) echo 'restarting adbd as root' ;;
  'pull -a /data/tombstones '*) mkdir -p "$4/tombstones" && echo '*** *** ***' > "$4/tombstones/tombstone_00" ;;
  'shell date +%s') date +%s ;;
  'shell getprop sys.boot_completed') [ -f "$FAKE_EMULATOR_PID" ] && echo 1 ;;
  'emu avd name')
    avd=Fake_AVD
    for entry in $FAKE_AVD_NAMES; do [ "\${entry%%=*}" = "$serial" ] && avd=\${entry#*=}; done
    echo "$avd"; echo OK ;;
  'shell getprop ro.product.cpu.abi') echo arm64-v8a ;;
esac
`;

const FAKE_EMULATOR = `#!/bin/sh
echo "emulator $*" >> "$FAKE_LOG"
[ "$1" = -list-avds ] && { echo Fake_AVD; exit 0; }
[ "$FAKE_EMULATOR_EXIT" = 1 ] && exit 1
echo $$ > "$FAKE_EMULATOR_PID"
exec sleep 30
`;

const FAKE_NDK_STACK = `#!/bin/sh
echo symbolized
`;

describe(
  'runtime-tests device selection',
  { skip: process.platform === 'win32' },
  () => {
    let workDir = '';

    afterEach(() => {
      stopFakeEmulator(path.join(workDir, 'emulator.pid'));
      fs.rmSync(workDir, { recursive: true, force: true });
    });

    it('collects server-only crash diagnostics only from --serial', () => {
      workDir = createWorkDir();
      const result = runDriver(workDir, {
        devices: [SELECTED, HUMAN_PHONE],
        args: ['--platform', 'android', '--serial', SELECTED],
      });

      assert.equal(result.status, 1, result.stderr);
      assert.match(
        result.stderr,
        new RegExp(`collecting crash diagnostics from ${SELECTED}`)
      );
      assert.deepEqual(result.adbCalls, [
        'devices',
        `-s ${SELECTED} logcat -b crash -d`,
        `-s ${SELECTED} logcat -b crash -d`,
        `-s ${SELECTED} logcat -b crash -c`,
        `-s ${SELECTED} root`,
        `-s ${SELECTED} wait-for-device`,
        `-s ${SELECTED} pull -a /data/tombstones ${result.tombstonesDir}`,
        `-s ${SELECTED} shell date +%s`,
        `-s ${SELECTED} shell rm -f /data/tombstones/*`,
        `-s ${SELECTED} shell getprop ro.product.cpu.abi`,
      ]);
      assert.match(result.stderr, /symbolized native stack trace/);
    });

    it('collects server-only crash diagnostics only from the --avd emulator', () => {
      workDir = createWorkDir();
      const result = runDriver(workDir, {
        devices: ['emulator-5554', 'emulator-5556'],
        avdNames: { 'emulator-5556': 'Second_AVD' },
        args: ['--platform', 'android', '--avd', 'Second_AVD'],
      });

      assert.equal(result.status, 1, result.stderr);
      assert.match(
        result.stderr,
        /collecting crash diagnostics from emulator-5556/
      );
      const deviceCalls = result.adbCalls.filter(
        (call) => call !== 'devices' && !call.endsWith(' emu avd name')
      );
      assert.ok(deviceCalls.length > 0);
      assert.ok(
        deviceCalls.every((call) => call.startsWith('-s emulator-5556 ')),
        deviceCalls.join('\n')
      );
    });

    it('skips server-only crash diagnostics without --serial', () => {
      workDir = createWorkDir();
      const result = runDriver(workDir, {
        devices: [SELECTED, HUMAN_PHONE],
        args: ['--platform', 'android'],
      });

      assert.equal(result.status, 1, result.stderr);
      assert.match(
        result.stderr,
        /no selected Android device available for crash diagnostics/
      );
      assert.deepEqual(result.adbCalls, []);
    });

    it('stops when several devices are connected and none is selected', () => {
      workDir = createWorkDir();
      const result = runDriver(workDir, {
        devices: [SELECTED, HUMAN_PHONE],
        args: ['--platform', 'android', ...LAUNCH],
      });

      assert.equal(result.status, 1, result.stderr);
      assert.match(
        result.stderr,
        new RegExp(
          `2 Android devices are connected \\(${SELECTED} device, ${HUMAN_PHONE} device\\), pass --serial or --avd`
        )
      );
      assert.deepEqual(result.adbCalls, ['devices']);
    });

    it('counts an offline emulator when it checks for several devices', () => {
      workDir = createWorkDir();
      const result = runDriver(workDir, {
        devices: [`${SELECTED}:offline`, HUMAN_PHONE],
        args: ['--platform', 'android', ...LAUNCH],
      });

      assert.equal(result.status, 1, result.stderr);
      assert.match(
        result.stderr,
        new RegExp(
          `2 Android devices are connected \\(${SELECTED} offline, ${HUMAN_PHONE} device\\)`
        )
      );
      assert.deepEqual(result.adbCalls, ['devices']);
    });

    it('uses the only connected device when none is selected', () => {
      workDir = createWorkDir();
      const result = runDriver(workDir, {
        devices: [SELECTED],
        args: ['--platform', 'android', ...LAUNCH],
      });

      assert.equal(result.status, 1, result.stderr);
      assert.deepEqual(result.adbCalls, [
        'devices',
        `-s ${SELECTED} shell getprop ro.product.cpu.abi`,
      ]);
    });

    it('stops when the booted emulator exits before it boots', () => {
      workDir = createWorkDir();
      const result = runDriver(workDir, {
        devices: [],
        args: ['--platform', 'android', ...LAUNCH],
        emulatorExits: true,
      });

      assert.equal(result.status, 1, result.stderr);
      assert.match(
        result.stderr,
        /Emulator Fake_AVD exited \(1\) before it booted/
      );
      assert.deepEqual(result.emulatorCalls, [
        'emulator -list-avds',
        'emulator -avd Fake_AVD -no-snapshot-save -no-boot-anim -no-audio',
      ]);
      assert.ok(
        result.adbCalls.every((call) => call === 'devices'),
        result.adbCalls.join('\n')
      );
    });

    it(
      'prints only the crash reports of the selected simulator',
      { skip: process.platform !== 'darwin' },
      () => {
        workDir = createWorkDir();
        const reportsDir = path.join(
          workDir,
          'Library',
          'Logs',
          'DiagnosticReports'
        );
        fs.mkdirSync(reportsDir, { recursive: true });
        writeIpsReport(
          reportsDir,
          'FabricExample-selected.ips',
          'SELECTED-UDID'
        );
        writeIpsReport(reportsDir, 'FabricExample-other.ips', 'OTHER-UDID');

        const result = runDriver(workDir, {
          devices: [],
          args: ['--platform', 'ios', '--udid', 'SELECTED-UDID'],
        });

        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /crash report FabricExample-selected\.ips/);
        assert.doesNotMatch(result.stderr, /FabricExample-other\.ips/);
      }
    );

    it(
      'skips server-only iOS crash reports without --udid',
      { skip: process.platform !== 'darwin' },
      () => {
        workDir = createWorkDir();
        const result = runDriver(workDir, {
          devices: [],
          args: ['--platform', 'ios'],
        });

        assert.equal(result.status, 1, result.stderr);
        assert.match(
          result.stderr,
          /no selected iOS simulator for crash reports/
        );
      }
    );
  }
);

function createWorkDir() {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-tests-driver-'))
  );
  fs.mkdirSync(path.join(dir, 'scripts'));
  for (const script of [
    'runtime-tests-server.js',
    'android-device.js',
    'runtime-tests-suites.js',
  ]) {
    fs.copyFileSync(
      path.join(SCRIPTS, script),
      path.join(dir, 'scripts', script)
    );
  }
  writeExecutable(path.join(dir, 'bin', 'adb'), FAKE_ADB);
  writeExecutable(path.join(dir, 'bin', 'emulator'), FAKE_EMULATOR);
  writeExecutable(path.join(dir, 'ndk', 'ndk-stack'), FAKE_NDK_STACK);
  fs.mkdirSync(
    path.join(
      dir,
      'android',
      'app',
      'build',
      'intermediates',
      'merged_native_libs',
      'debugRuntimeTests',
      'out',
      'lib',
      'arm64-v8a'
    ),
    { recursive: true }
  );
  return dir;
}

function runDriver(
  dir: string,
  options: {
    devices: string[];
    args: string[];
    emulatorExits?: boolean;
    avdNames?: Record<string, string>;
  }
) {
  const log = path.join(dir, 'calls.log');
  const androidHome = path.join(dir, 'sdk');
  const result = spawnSync(
    process.execPath,
    [
      path.join(dir, 'scripts', 'runtime-tests-server.js'),
      '--library',
      'self-tests',
      '--host',
      '127.0.0.1',
      '--port',
      '0',
      '--connect-timeout',
      '0.1',
      ...options.args,
    ],
    {
      encoding: 'utf8',
      timeout: 60_000,
      env: {
        PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`,
        HOME: dir,
        NODE_PATH: NODE_MODULES,
        ANDROID_HOME: androidHome,
        ANDROID_NDK_HOME: path.join(dir, 'ndk'),
        FAKE_LOG: log,
        FAKE_DEVICES: options.devices
          .map((device) => (device.includes(':') ? device : `${device}:device`))
          .join(' '),
        FAKE_EMULATOR_EXIT: options.emulatorExits ? '1' : '0',
        FAKE_AVD_NAMES: Object.entries(options.avdNames ?? {})
          .map(([serial, avd]) => `${serial}=${avd}`)
          .join(' '),
        FAKE_EMULATOR_PID: path.join(dir, 'emulator.pid'),
      },
    }
  );
  const calls = fs.existsSync(log)
    ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean)
    : [];
  const crashReports = path.join(dir, 'crash-reports');
  const tombstonesDir = fs.existsSync(crashReports)
    ? fs
        .readdirSync(crashReports)
        .filter((name) => name.startsWith('tombstones-'))
        .map((name) => path.join(crashReports, name))[0]
    : undefined;
  return {
    status: result.status,
    stderr: result.stderr,
    adbCalls: calls.filter((call) => !call.startsWith('emulator ')),
    emulatorCalls: calls.filter((call) => call.startsWith('emulator ')),
    tombstonesDir,
  };
}

function stopFakeEmulator(pidFile: string) {
  if (!fs.existsSync(pidFile)) {
    return;
  }
  try {
    process.kill(Number(fs.readFileSync(pidFile, 'utf8')), 'SIGTERM');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
      throw error;
    }
  }
}

function writeExecutable(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { mode: 0o755 });
}

function writeIpsReport(dir: string, name: string, udid: string) {
  const header = JSON.stringify({ app_name: 'FabricExample' });
  const body = JSON.stringify({
    procPath: `/Users/USER/Library/Developer/CoreSimulator/Devices/${udid}/data/Containers/Bundle/Application/APP/FabricExample.app/FabricExample`,
  });
  fs.writeFileSync(path.join(dir, name), `${header}\n${body}`);
}
