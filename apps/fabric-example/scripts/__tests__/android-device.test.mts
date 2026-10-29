import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import androidDevice from '../android-device.js';

const { resolveAndroidDevice, parseAvdName } = androidDevice;

type FakeDevice = { serial: string; avd: string | null; booted: boolean };

type FakeOptions = {
  devices?: FakeDevice[];
  avds?: string[];
  bootsAs?: string | null;
};

function createFakeAndroid({
  devices = [],
  avds = [],
  bootsAs = null,
}: FakeOptions) {
  const connected = devices.map((device) => ({ ...device }));
  const booted: string[] = [];
  const queriedAvdNames: string[] = [];
  const tools = {
    listDevices: async () => connected.map((device) => device.serial),
    avdName: async (serial: string) => {
      queriedAvdNames.push(serial);
      const device = connected.find((d) => d.serial === serial);
      if (!device || device.avd === null) {
        throw new Error(`error: no emulator detected on ${serial}`);
      }
      return device.avd;
    },
    listAvds: async () => avds,
    bootAvd: (avd: string) => {
      booted.push(avd);
      if (bootsAs) {
        connected.push({ serial: bootsAs, avd, booted: false });
      }
    },
    isBootCompleted: async (serial: string) => {
      const device = connected.find((d) => d.serial === serial);
      if (!device) {
        return false;
      }
      const wasBooted = device.booted;
      device.booted = true;
      return wasBooted;
    },
    sleep: (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, Math.min(ms, 1))),
    log: () => {},
    bootTimeoutMs: 100,
  };
  return { tools, booted, queriedAvdNames };
}

const OTHER_EMULATOR: FakeDevice = {
  serial: 'emulator-5554',
  avd: 'Other_Agent_AVD',
  booted: true,
};
const PHONE: FakeDevice = { serial: 'R58M123ABC', avd: null, booted: true };

describe('resolveAndroidDevice', () => {
  it('picks the running emulator of the requested AVD among other devices', async () => {
    const fake = createFakeAndroid({
      devices: [
        OTHER_EMULATOR,
        PHONE,
        { serial: 'emulator-5556', avd: 'Mine', booted: true },
      ],
      avds: ['Other_Agent_AVD', 'Mine'],
    });
    const serial = await resolveAndroidDevice(
      { serial: null, avd: 'Mine' },
      fake.tools
    );
    assert.equal(serial, 'emulator-5556');
    assert.deepEqual(fake.booted, []);
  });

  it('boots the requested AVD when only other devices are connected', async () => {
    const fake = createFakeAndroid({
      devices: [OTHER_EMULATOR, PHONE],
      avds: ['Other_Agent_AVD', 'Mine'],
      bootsAs: 'emulator-5558',
    });
    const serial = await resolveAndroidDevice(
      { serial: null, avd: 'Mine' },
      fake.tools
    );
    assert.equal(serial, 'emulator-5558');
    assert.deepEqual(fake.booted, ['Mine']);
  });

  it('fails without touching other devices when the AVD does not exist', async () => {
    const fake = createFakeAndroid({
      devices: [OTHER_EMULATOR],
      avds: ['Other_Agent_AVD'],
    });
    await assert.rejects(
      resolveAndroidDevice({ serial: null, avd: 'Missing' }, fake.tools),
      /AVD Missing/
    );
    assert.deepEqual(fake.booted, []);
  });

  it('fails instead of falling back when the requested AVD never comes up', async () => {
    const fake = createFakeAndroid({
      devices: [OTHER_EMULATOR],
      avds: ['Other_Agent_AVD', 'Mine'],
      bootsAs: null,
    });
    await assert.rejects(
      resolveAndroidDevice({ serial: null, avd: 'Mine' }, fake.tools),
      /Emulator Mine did not boot/
    );
    assert.deepEqual(fake.booted, ['Mine']);
  });

  it('keeps --serial behaviour and ignores --avd when both are given', async () => {
    const fake = createFakeAndroid({
      devices: [OTHER_EMULATOR, PHONE],
      avds: ['Mine'],
    });
    assert.equal(
      await resolveAndroidDevice(
        { serial: 'R58M123ABC', avd: 'Mine' },
        fake.tools
      ),
      'R58M123ABC'
    );
    await assert.rejects(
      resolveAndroidDevice({ serial: 'emulator-9999', avd: null }, fake.tools),
      /No connected Android device with serial emulator-9999/
    );
    assert.deepEqual(fake.queriedAvdNames, []);
    assert.deepEqual(fake.booted, []);
  });

  it('uses the first connected device when no target is given', async () => {
    const fake = createFakeAndroid({ devices: [OTHER_EMULATOR, PHONE] });
    assert.equal(
      await resolveAndroidDevice({ serial: null, avd: null }, fake.tools),
      'emulator-5554'
    );
  });

  it('boots the first AVD when no target is given and nothing is connected', async () => {
    const fake = createFakeAndroid({
      avds: ['First', 'Second'],
      bootsAs: 'emulator-5554',
    });
    assert.equal(
      await resolveAndroidDevice({ serial: null, avd: null }, fake.tools),
      'emulator-5554'
    );
    assert.deepEqual(fake.booted, ['First']);
  });
});

describe('parseAvdName', () => {
  it('reads the AVD name from `adb emu avd name` output', () => {
    assert.equal(parseAvdName('Pixel_9_API_36\r\nOK\r\n'), 'Pixel_9_API_36');
    assert.equal(parseAvdName('Pixel_9_API_36\nOK\n'), 'Pixel_9_API_36');
  });

  it('returns null for empty or error output', () => {
    assert.equal(parseAvdName(''), null);
    assert.equal(parseAvdName('OK\r\n'), null);
    assert.equal(parseAvdName('KO: unknown command\r\n'), null);
  });
});
