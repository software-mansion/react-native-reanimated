import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import androidDevice from '../android-device.js';

const { resolveAndroidDevice, parseAvdName } = androidDevice;

type FakeDevice = {
  serial: string;
  avd: string | null;
  booted: boolean;
  neverBoots?: boolean;
  state?: string;
};

type FakeOptions = {
  devices?: FakeDevice[];
  avds?: string[];
  bootsAs?: string | null;
  bootExitStatus?: string | null;
  onSleep?: (connected: FakeDevice[]) => void;
  bootTimeoutMs?: number;
  exitGraceMs?: number;
};

function createFakeAndroid({
  devices = [],
  avds = [],
  bootsAs = null,
  bootExitStatus = null,
  onSleep = () => {},
  bootTimeoutMs = 5000,
  exitGraceMs = 5000,
}: FakeOptions) {
  const connected = devices.map((device) => ({ ...device }));
  const booted: string[] = [];
  const queriedAvdNames: string[] = [];
  const bootChecks: string[] = [];
  const tools = {
    listDevices: async () =>
      connected.map((device) => ({
        serial: device.serial,
        state: device.state ?? 'device',
      })),
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
      return () => bootExitStatus;
    },
    isBootCompleted: async (serial: string) => {
      bootChecks.push(serial);
      const device = connected.find((d) => d.serial === serial);
      if (!device) {
        return false;
      }
      if (device.neverBoots) {
        return false;
      }
      const wasBooted = device.booted;
      device.booted = true;
      return wasBooted;
    },
    sleep: (ms: number) => {
      onSleep(connected);
      return new Promise<void>((resolve) =>
        setTimeout(resolve, Math.min(ms, 1))
      );
    },
    log: () => {},
    bootTimeoutMs,
    exitGraceMs,
  };
  return { tools, booted, queriedAvdNames, bootChecks };
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

  it('waits for a running emulator of the requested AVD to finish booting', async () => {
    const fake = createFakeAndroid({
      devices: [
        OTHER_EMULATOR,
        { serial: 'emulator-5556', avd: 'Mine', booted: false },
      ],
      avds: ['Other_Agent_AVD', 'Mine'],
    });
    const serial = await resolveAndroidDevice(
      { serial: null, avd: 'Mine' },
      fake.tools
    );
    assert.equal(serial, 'emulator-5556');
    assert.deepEqual(fake.booted, []);
    assert.deepEqual(fake.bootChecks, ['emulator-5556', 'emulator-5556']);
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
      bootTimeoutMs: 100,
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

  it('returns a booted instance of the AVD when another instance never boots', async () => {
    const fake = createFakeAndroid({
      devices: [
        {
          serial: 'emulator-5554',
          avd: 'Mine',
          booted: false,
          neverBoots: true,
        },
        { serial: 'emulator-5556', avd: 'Mine', booted: true },
      ],
      avds: ['Mine'],
    });
    assert.equal(
      await resolveAndroidDevice({ serial: null, avd: 'Mine' }, fake.tools),
      'emulator-5556'
    );
    assert.deepEqual(fake.booted, []);
  });

  it('waits for each matching instance to boot before returning one', async () => {
    const fake = createFakeAndroid({
      devices: [
        { serial: 'emulator-5554', avd: 'Mine', booted: false },
        { serial: 'emulator-5556', avd: 'Mine', booted: false },
      ],
      avds: ['Mine'],
    });
    assert.equal(
      await resolveAndroidDevice({ serial: null, avd: 'Mine' }, fake.tools),
      'emulator-5554'
    );
    assert.deepEqual(fake.booted, []);
    assert.deepEqual(fake.bootChecks, [
      'emulator-5554',
      'emulator-5556',
      'emulator-5554',
    ]);
  });

  it('uses the only connected device when no target is given', async () => {
    const fake = createFakeAndroid({ devices: [PHONE] });
    assert.equal(
      await resolveAndroidDevice({ serial: null, avd: null }, fake.tools),
      'R58M123ABC'
    );
  });

  it('fails when several devices are connected and no target is given', async () => {
    const fake = createFakeAndroid({ devices: [OTHER_EMULATOR, PHONE] });
    await assert.rejects(
      resolveAndroidDevice({ serial: null, avd: null }, fake.tools),
      /2 Android devices are connected \(emulator-5554 device, R58M123ABC device\), pass --serial or --avd/
    );
    assert.deepEqual(fake.queriedAvdNames, []);
    assert.deepEqual(fake.booted, []);
  });

  it('counts an offline emulator when no target is given', async () => {
    const fake = createFakeAndroid({
      devices: [
        {
          serial: 'emulator-5554',
          avd: 'Mine',
          booted: false,
          state: 'offline',
        },
        PHONE,
      ],
    });
    await assert.rejects(
      resolveAndroidDevice({ serial: null, avd: null }, fake.tools),
      /2 Android devices are connected \(emulator-5554 offline, R58M123ABC device\)/
    );
  });

  it('does not use the only device when it is not ready', async () => {
    const fake = createFakeAndroid({
      devices: [{ ...PHONE, state: 'unauthorized' }],
      avds: ['Mine'],
    });
    await assert.rejects(
      resolveAndroidDevice({ serial: null, avd: null }, fake.tools),
      /Android device R58M123ABC is unauthorized/
    );
    assert.deepEqual(fake.booted, []);
  });

  it('uses an instance of the AVD that was still offline when its duplicate exits', async () => {
    let sleeps = 0;
    const fake = createFakeAndroid({
      devices: [
        {
          serial: 'emulator-5554',
          avd: 'Mine',
          booted: false,
          state: 'offline',
        },
      ],
      avds: ['Mine'],
      bootExitStatus: '1',
      onSleep: (connected) => {
        sleeps += 1;
        if (sleeps === 2) {
          connected[0].state = 'device';
        }
      },
    });
    assert.equal(
      await resolveAndroidDevice({ serial: null, avd: 'Mine' }, fake.tools),
      'emulator-5554'
    );
    assert.deepEqual(fake.booted, ['Mine']);
  });

  it('reports the exit of the booted emulator when only another AVD is offline', async () => {
    const fake = createFakeAndroid({
      devices: [
        {
          serial: 'emulator-5556',
          avd: 'Other',
          booted: false,
          state: 'offline',
        },
      ],
      avds: ['Mine'],
      bootExitStatus: '1',
      bootTimeoutMs: 60_000,
      exitGraceMs: 60_000,
    });
    await assert.rejects(
      resolveAndroidDevice({ serial: null, avd: 'Mine' }, fake.tools),
      /Emulator Mine exited \(1\) before it booted/
    );
  });

  it('reports the exit after a grace period when an unknown emulator stays offline', async () => {
    const fake = createFakeAndroid({
      devices: [
        { serial: 'emulator-5556', avd: null, booted: false, state: 'offline' },
      ],
      avds: ['Mine'],
      bootExitStatus: '1',
      bootTimeoutMs: 60_000,
      exitGraceMs: 50,
    });
    await assert.rejects(
      resolveAndroidDevice({ serial: null, avd: 'Mine' }, fake.tools),
      /Emulator Mine exited \(1\) before it booted/
    );
  });

  it('fails as soon as the booted emulator exits', async () => {
    const fake = createFakeAndroid({
      avds: ['Mine'],
      bootExitStatus: '1',
      bootTimeoutMs: 1000,
    });
    await assert.rejects(
      resolveAndroidDevice({ serial: null, avd: 'Mine' }, fake.tools),
      /Emulator Mine exited \(1\) before it booted/
    );
    assert.deepEqual(fake.booted, ['Mine']);
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
    assert.equal(parseAvdName('KOALA_AVD\r\nOK\r\n'), 'KOALA_AVD');
    assert.equal(parseAvdName('KO\r\nOK\r\n'), 'KO');
    assert.equal(parseAvdName('OK\r\nOK\r\n'), 'OK');
  });

  it('returns null for empty or error output', () => {
    assert.equal(parseAvdName(''), null);
    assert.equal(parseAvdName('OK\r\n'), null);
    assert.equal(parseAvdName('KO: unknown command\r\n'), null);
    assert.equal(parseAvdName('KO\r\n'), null);
  });
});
