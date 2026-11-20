import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  AndroidDevice,
  DeviceStateGuard,
  changedStateKeys,
  checkAbi,
  checkSdk,
  cleanUpDevice,
} from '../android-device.mts';
import type { DeviceState } from '../android-device.mts';
import type { Processes } from '../processes.mts';

function fixture(name: string): string {
  return fs.readFileSync(
    path.join(import.meta.dirname, 'fixtures', name),
    'utf8'
  );
}

function deviceWith(outputs: Record<string, string>): AndroidDevice {
  const processes = {
    run: async (_adb: string, args: string[]) => {
      const command = args.slice(3).join(' ');
      const output = Object.entries(outputs).find(([prefix]) =>
        command.startsWith(prefix)
      )?.[1];
      if (output === undefined) {
        throw new Error(`adb ${command} failed (exit 1):\nno output`);
      }
      return { stdout: output, stderr: '' };
    },
  } as unknown as Processes;
  return new AndroidDevice(processes, 'adb', 'S1');
}

function readBattery(output: string) {
  return deviceWith({ 'dumpsys battery': output }).readBattery();
}

function readThermalStatus(output: string) {
  return deviceWith({ 'dumpsys thermalservice': output }).readThermalStatus();
}

function readRefreshRate(output: string) {
  return deviceWith({ 'dumpsys display': output }).readRefreshRate();
}

async function readWifi(output: string) {
  const state = await deviceWith({
    'dumpsys battery': fixture('battery.txt'),
    getprop: '37',
    'dumpsys display': fixture('display.txt'),
    settings: '1',
    'cmd wifi status': output,
    'dumpsys thermalservice': fixture('thermal.txt'),
  }).readState();
  return { wifiEnabled: state.wifiEnabled, wifiConnected: state.wifiConnected };
}

function startActivity(output: string) {
  return deviceWith({ 'am start': output }).startActivity(
    'com.benchprobe',
    'css',
    undefined
  );
}

function readPid(output: string) {
  return deviceWith({ pidof: output }).readPid('com.reanimatedbenchmark.a');
}

const STATE: DeviceState = {
  model: 'sdk_gphone64_arm64',
  deviceId: 'HW1',
  fingerprint: 'google/sdk_gphone64_arm64/emu64a:17/X/1:user/release-keys',
  sdk: 37,
  abi: 'arm64-v8a',
  refreshRate: 60,
  brightness: 102,
  brightnessMode: 'manual',
  batteryLevel: 100,
  batteryStatus: 'charging',
  chargeState: 'ac',
  wifiEnabled: true,
  wifiConnected: true,
  thermalStatus: 0,
  batteryTemperature: 25,
};

describe('AndroidDevice.readBattery', () => {
  it('reads level, status, power sources and temperature', async () => {
    assert.deepEqual(await readBattery(fixture('battery.txt')), {
      level: 100,
      status: 'charging',
      chargeState: 'ac',
      temperature: 25,
    });
  });

  it('reads the dump of a Samsung phone with Android 16 and its log sections', async () => {
    assert.deepEqual(await readBattery(fixture('battery-samsung-a16.txt')), {
      level: 80,
      status: 'not charging',
      chargeState: 'usb',
      temperature: 27.3,
    });
  });

  it('keeps the first value of a field that a later section repeats', async () => {
    const output = `${fixture('battery.txt')}\n[Log]\n  level: 5\n  temperature: 400\n`;
    const battery = await readBattery(output);
    assert.equal(battery.level, 100);
    assert.equal(battery.temperature, 25);
  });

  it('gives none when no power source is plugged in', async () => {
    const output = fixture('battery.txt').replace(
      'AC powered: true',
      'AC powered: false'
    );
    assert.equal((await readBattery(output)).chargeState, 'none');
  });
});

describe('AndroidDevice.readThermalStatus', () => {
  it('reads the thermal status', async () => {
    assert.equal(await readThermalStatus(fixture('thermal.txt')), 0);
    assert.equal(
      await readThermalStatus(fixture('thermal-samsung-a16.txt')),
      0
    );
    assert.equal(await readThermalStatus('Thermal Status: 3\n'), 3);
  });

  it('stops when the line is absent', async () => {
    await assert.rejects(readThermalStatus('nothing'), /Thermal Status/);
  });
});

describe('AndroidDevice.readRefreshRate', () => {
  it('reads the render frame rate', async () => {
    assert.equal(await readRefreshRate(fixture('display.txt')), 60);
  });

  it('reads the render frame rate and not the highest supported mode', async () => {
    assert.equal(await readRefreshRate(fixture('display-samsung-a16.txt')), 60);
  });

  it('prefers the render frame rate to the rate of the active mode', async () => {
    const output =
      '  DisplayDeviceInfo{"Built-in Screen": uniqueId="local:1", 1080 x 2400, modeId 2, renderFrameRate 60.0, defaultModeId 1, supportedModes [{id=1, width=1080, height=2400, fps=60.000004}, {id=2, width=1080, height=2400, fps=120.00001}], colorMode 0}';
    assert.equal(await readRefreshRate(output), 60);
  });

  it('reads the active mode when the dump has no render frame rate', async () => {
    const output =
      '  DisplayDeviceInfo{"Built-in Screen": uniqueId="local:1", 1080 x 2400, modeId 2, defaultModeId 1, supportedModes [{id=1, width=1080, height=2400, fps=60.000004}, {id=2, width=1080, height=2400, fps=120.00001}], colorMode 0}';
    assert.equal(await readRefreshRate(output), 120);
  });
});

describe('AndroidDevice.readState', () => {
  it('reads Wi-Fi on and connected', async () => {
    assert.deepEqual(await readWifi(fixture('wifi.txt')), {
      wifiEnabled: true,
      wifiConnected: true,
    });
    assert.deepEqual(await readWifi(fixture('wifi-samsung-a16.txt')), {
      wifiEnabled: true,
      wifiConnected: true,
    });
  });

  it('reads Wi-Fi off', async () => {
    assert.deepEqual(
      await readWifi('Wifi is disabled\nWifi is not connected\n'),
      {
        wifiEnabled: false,
        wifiConnected: false,
      }
    );
  });
});

describe('AndroidDevice.startActivity', () => {
  it('reads TotalTime of a cold start', async () => {
    assert.deepEqual(await startActivity(fixture('am-start.txt')), {
      started: true,
      totalTime: 112,
    });
  });

  it('gives the error when the activity does not start', async () => {
    assert.deepEqual(await startActivity(fixture('am-start-error.txt')), {
      started: false,
      reason:
        'Error: Activity class {com.benchprobe/com.benchprobe.NoActivity} does not exist.',
    });
  });
});

describe('device checks', () => {
  it('lists the compared keys that changed', () => {
    assert.deepEqual(
      changedStateKeys(STATE, {
        ...STATE,
        thermalStatus: 1,
        batteryTemperature: 30,
      }),
      []
    );
    assert.deepEqual(
      changedStateKeys(STATE, {
        ...STATE,
        brightness: 50,
        batteryLevel: 99,
        wifiConnected: false,
      }),
      [
        'brightness: 102 -> 50',
        'batteryLevel: 100 -> 99',
        'wifiConnected: true -> false',
      ]
    );
  });

  it('stops below SDK 31 and on other ABIs', () => {
    assert.throws(() => checkSdk({ ...STATE, sdk: 30 }), /SDK 31 or newer/);
    assert.throws(
      () => checkAbi({ ...STATE, abi: 'x86_64' }),
      /arm64-v8a only/
    );
    checkSdk(STATE);
    checkAbi(STATE);
  });
});

describe('AndroidDevice.readPid', () => {
  it('reads one pid, or none when the app does not run', async () => {
    assert.equal(await readPid('4321\n'), 4321);
    assert.equal(await readPid(''), null);
    await assert.rejects(readPid('4321 4322\n'), /Several processes/);
  });
});

describe('DeviceStateGuard', () => {
  it('does not compare the refresh rate while no app runs', () => {
    const guard = new DeviceStateGuard(STATE);
    guard.checkIdle({ ...STATE, refreshRate: 120 });
    assert.throws(
      () => guard.checkIdle({ ...STATE, chargeState: 'none' }),
      /device state changed \(read before the cool-down\): chargeState: ac -> none/
    );
  });

  it('takes the refresh rate of the first in-app reading as the reference', () => {
    const guard = new DeviceStateGuard({ ...STATE, refreshRate: 120 });
    assert.equal(guard.checkInApp(STATE, 'before the trace'), 60);
    assert.equal(guard.checkInApp(STATE, 'after the trace'), 60);
    assert.throws(
      () => guard.checkInApp({ ...STATE, refreshRate: 90 }, 'after the trace'),
      /device state changed \(read after the trace\): refreshRate: 60 -> 90/
    );
  });

  it('stops when the battery level changes', () => {
    const guard = new DeviceStateGuard(STATE);
    assert.throws(
      () => guard.checkIdle({ ...STATE, batteryLevel: 99 }),
      /batteryLevel: 100 -> 99/
    );
  });

  it('compares the other keys with the session start while the app runs', () => {
    const guard = new DeviceStateGuard(STATE);
    assert.throws(
      () =>
        guard.checkInApp({ ...STATE, wifiEnabled: false }, 'before the trace'),
      /wifiEnabled: true -> false/
    );
  });
});

describe('cleanUpDevice', () => {
  it('tries each step also when an earlier step fails', async () => {
    const calls: string[] = [];
    const messages: string[] = [];
    await cleanUpDevice(
      {
        forceStop: async (applicationId) => {
          calls.push(`stop ${applicationId}`);
          throw new Error('device offline');
        },
        stopTraces: async () => void calls.push('stop perfetto'),
        removeAllTraces: async () => void calls.push('remove traces'),
      },
      ['com.reanimatedbenchmark.a', 'com.reanimatedbenchmark.b'],
      (message) => messages.push(message)
    );
    assert.deepEqual(calls, [
      'stop com.reanimatedbenchmark.a',
      'stop com.reanimatedbenchmark.b',
      'stop perfetto',
      'remove traces',
    ]);
    assert.deepEqual(messages, [
      'cleanup: cannot stop com.reanimatedbenchmark.a: device offline',
      'cleanup: cannot stop com.reanimatedbenchmark.b: device offline',
    ]);
  });
});
