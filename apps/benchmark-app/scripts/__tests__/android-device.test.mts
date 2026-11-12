import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  DeviceStateGuard,
  changedStateKeys,
  checkAbi,
  checkSdk,
  cleanUpDevice,
  parseActiveRefreshRate,
  parseActivityStart,
  parseBattery,
  parsePid,
  parseThermalStatus,
  parseWifiStatus,
} from '../android-device.mts';
import type { DeviceState } from '../android-device.mts';

function fixture(name: string): string {
  return fs.readFileSync(
    path.join(import.meta.dirname, 'fixtures', name),
    'utf8'
  );
}

const STATE: DeviceState = {
  model: 'sdk_gphone64_arm64',
  hardwareSerial: 'HW1',
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

describe('parseBattery', () => {
  it('reads level, status, power sources and temperature', () => {
    assert.deepEqual(parseBattery(fixture('battery.txt')), {
      level: 100,
      status: 'charging',
      chargeState: 'ac',
      temperature: 25,
    });
  });

  it('reads the dump of a Samsung phone with Android 16 and its log sections', () => {
    assert.deepEqual(parseBattery(fixture('battery-samsung-a16.txt')), {
      level: 80,
      status: 'not charging',
      chargeState: 'usb',
      temperature: 27.3,
    });
  });

  it('keeps the first value of a field that a later section repeats', () => {
    const output = `${fixture('battery.txt')}\n[Log]\n  level: 5\n  temperature: 400\n`;
    assert.equal(parseBattery(output).level, 100);
    assert.equal(parseBattery(output).temperature, 25);
  });

  it('gives none when no power source is plugged in', () => {
    const output = fixture('battery.txt').replace(
      'AC powered: true',
      'AC powered: false'
    );
    assert.equal(parseBattery(output).chargeState, 'none');
  });
});

describe('parseThermalStatus', () => {
  it('reads the thermal status', () => {
    assert.equal(parseThermalStatus(fixture('thermal.txt')), 0);
    assert.equal(parseThermalStatus(fixture('thermal-samsung-a16.txt')), 0);
    assert.equal(parseThermalStatus('Thermal Status: 3\n'), 3);
  });

  it('stops when the line is absent', () => {
    assert.throws(() => parseThermalStatus('nothing'), /Thermal Status/);
  });
});

describe('parseActiveRefreshRate', () => {
  it('reads the render frame rate', () => {
    assert.equal(parseActiveRefreshRate(fixture('display.txt')), 60);
  });

  it('reads the render frame rate and not the highest supported mode', () => {
    assert.equal(
      parseActiveRefreshRate(fixture('display-samsung-a16.txt')),
      60
    );
  });

  it('prefers the render frame rate to the rate of the active mode', () => {
    const output =
      '  DisplayDeviceInfo{"Built-in Screen": uniqueId="local:1", 1080 x 2400, modeId 2, renderFrameRate 60.0, defaultModeId 1, supportedModes [{id=1, width=1080, height=2400, fps=60.000004}, {id=2, width=1080, height=2400, fps=120.00001}], colorMode 0}';
    assert.equal(parseActiveRefreshRate(output), 60);
  });

  it('reads the active mode when the dump has no render frame rate', () => {
    const output =
      '  DisplayDeviceInfo{"Built-in Screen": uniqueId="local:1", 1080 x 2400, modeId 2, defaultModeId 1, supportedModes [{id=1, width=1080, height=2400, fps=60.000004}, {id=2, width=1080, height=2400, fps=120.00001}], colorMode 0}';
    assert.equal(parseActiveRefreshRate(output), 120);
  });
});

describe('parseWifiStatus', () => {
  it('reads Wi-Fi on and connected', () => {
    assert.deepEqual(parseWifiStatus(fixture('wifi.txt')), {
      wifiEnabled: true,
      wifiConnected: true,
    });
    assert.deepEqual(parseWifiStatus(fixture('wifi-samsung-a16.txt')), {
      wifiEnabled: true,
      wifiConnected: true,
    });
  });

  it('reads Wi-Fi off', () => {
    assert.deepEqual(
      parseWifiStatus('Wifi is disabled\nWifi is not connected\n'),
      {
        wifiEnabled: false,
        wifiConnected: false,
      }
    );
  });
});

describe('parseActivityStart', () => {
  it('reads TotalTime of a cold start', () => {
    assert.deepEqual(parseActivityStart(fixture('am-start.txt')), {
      started: true,
      totalTime: 112,
    });
  });

  it('gives the error when the activity does not start', () => {
    assert.deepEqual(parseActivityStart(fixture('am-start-error.txt')), {
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

describe('parsePid', () => {
  it('reads one pid, or none when the app does not run', () => {
    assert.equal(parsePid('4321\n'), 4321);
    assert.equal(parsePid(''), null);
    assert.throws(() => parsePid('4321 4322\n'), /Several processes/);
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
