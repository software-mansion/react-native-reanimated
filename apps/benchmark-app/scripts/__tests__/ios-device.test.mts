import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  IosDevice,
  changedIosStateKeys,
  readIosToolVersions,
} from '../ios-device.mts';
import type { IosDeviceState } from '../ios-device.mts';
import type { Processes } from '../processes.mts';

const UDID = '00008110-000A1B2C3D4E801E';
const APP = 'com.reanimatedbenchmark.a';
const STATE: IosDeviceState = {
  deviceId: UDID,
  name: 'Test iPhone',
  model: 'iPhone 13 mini',
  productType: 'iPhone14,4',
  osVersion: '27.0.1',
  osBuild: '24A446',
};

function fixture(name: string): string {
  return fs.readFileSync(
    path.join(import.meta.dirname, 'fixtures', name),
    'utf8'
  );
}

function fakeProcesses(outputs: Record<string, string>) {
  const commands: string[] = [];
  const processes = {
    run: async (command: string, args: string[]) => {
      const line = [command, ...args].join(' ');
      commands.push(line);
      const key = Object.keys(outputs).find((part) => line.includes(part));
      if (key === undefined) {
        return { stdout: '', stderr: '' };
      }
      return { stdout: outputs[key], stderr: '' };
    },
    streamLines: (command: string, args: string[]) => {
      commands.push([command, ...args].join(' '));
      return { stop: () => {}, failure: () => null };
    },
  } as unknown as Processes;
  return { processes, commands };
}

describe('IosDevice.readState', () => {
  const readState = (details: string) =>
    new IosDevice(
      fakeProcesses({ 'info details': details }).processes,
      UDID
    ).readState();

  it('reads the state of the device from the JSON of devicectl', async () => {
    assert.deepEqual(await readState(fixture('devicectl-details.json')), STATE);
  });

  it('is a tool error when a value is missing or the output is not JSON', async () => {
    const details = JSON.parse(fixture('devicectl-details.json'));
    delete details.result.properties.software.osBuildVersions;
    await assert.rejects(
      readState(JSON.stringify(details)),
      /do not give: osBuild/
    );
    await assert.rejects(
      readState('ERROR: no device'),
      /Cannot read the JSON output of devicectl/
    );
    await assert.rejects(readState('{"error":{}}'), /has no result/);
  });
});

describe('IosDevice.launch', () => {
  it('gives the scenario and the load as launch arguments of the app', () => {
    const { processes, commands } = fakeProcesses({});
    const device = new IosDevice(processes, UDID);
    device.launch(APP, 'css', undefined, () => {});
    device.launch(APP, undefined, undefined, () => {});
    assert.deepEqual(commands, [
      `xcrun devicectl device process launch --device ${UDID} --console --terminate-existing ${APP} -- -benchmarkScenario css`,
      `xcrun devicectl device process launch --device ${UDID} --console --terminate-existing ${APP}`,
    ]);
  });
});

describe('changedIosStateKeys', () => {
  it('compares the device, the model and the OS build', () => {
    assert.deepEqual(changedIosStateKeys(STATE, { ...STATE, name: 'x' }), []);
    assert.deepEqual(
      changedIosStateKeys(STATE, {
        ...STATE,
        deviceId: 'OTHER',
        osBuild: '24B1',
      }),
      [`deviceId: ${UDID} -> OTHER`, 'osBuild: 24A446 -> 24B1']
    );
  });
});

describe('IosDevice', () => {
  it('reads the state with devicectl and names the UDID when the device is not ready', async () => {
    const ready = fakeProcesses({
      'info details': fixture('devicectl-details.json'),
    });
    assert.deepEqual(
      await new IosDevice(ready.processes, UDID).readState(),
      STATE
    );
    assert.deepEqual(ready.commands, [
      `xcrun devicectl device info details --quiet --json-output - --device ${UDID}`,
    ]);
    const failing = {
      run: async () => {
        throw new Error('devicectl failed (exit 1)');
      },
    } as unknown as Processes;
    await assert.rejects(
      new IosDevice(failing, UDID).readState(),
      new RegExp(`No ready device with UDID ${UDID}.*devicectl failed`)
    );
  });

  it('stops only the processes of the app', async () => {
    const { processes, commands } = fakeProcesses({
      'info apps': fixture('devicectl-apps.json'),
      'info processes': fixture('devicectl-processes.json'),
    });
    await new IosDevice(processes, UDID).terminate(APP);
    assert.deepEqual(commands, [
      `xcrun devicectl device info apps --bundle-id ${APP} --quiet --json-output - --device ${UDID}`,
      `xcrun devicectl device info processes --quiet --json-output - --device ${UDID}`,
      `xcrun devicectl device process terminate --pid 8941 --kill --device ${UDID}`,
    ]);
  });

  it('does nothing to stop an app that is not installed, and refuses to measure it', async () => {
    const notInstalled = JSON.stringify({ result: { apps: [] } });
    const { processes, commands } = fakeProcesses({
      'info apps': notInstalled,
    });
    const device = new IosDevice(processes, UDID);
    await device.terminate(APP);
    assert.equal(commands.length, 1);
    await assert.rejects(
      device.checkInstalled(APP),
      /com\.reanimatedbenchmark\.a is not installed/
    );
  });

  it('installs and launches with the console', async () => {
    const { processes, commands } = fakeProcesses({});
    const device = new IosDevice(processes, UDID);
    await device.install('/builds/a.ipa');
    device.launch(APP, 'css', 5, () => {});
    assert.deepEqual(commands, [
      `xcrun devicectl device install app /builds/a.ipa --device ${UDID}`,
      `xcrun devicectl device process launch --device ${UDID} --console --terminate-existing ${APP} -- -benchmarkScenario css -benchmarkLoad 5`,
    ]);
  });
});

describe('IosDevice.install', () => {
  it('names the full phone storage as a cause when the install fails', async () => {
    const failing = {
      run: async () => {
        throw new Error('devicectl failed (exit 1): ERROR: Failed to install');
      },
    } as unknown as Processes;
    await assert.rejects(
      new IosDevice(failing, UDID).install('/builds/a.ipa'),
      new RegExp(
        `The install of /builds/a\\.ipa on ${UDID} failed\\. One known cause is a full phone storage: the Instruments service of the phone keeps about 0\\.3 GB of trace data for each xctrace recording until the service ends\\. A restart of the phone is the only known way to free it\\. devicectl: devicectl failed \\(exit 1\\): ERROR: Failed to install`
      )
    );
  });
});

describe('readIosToolVersions', () => {
  it('reads the versions of Xcode, xctrace and devicectl', async () => {
    const { processes } = fakeProcesses({
      'xcodebuild -version': 'Xcode 27.2\nBuild version 27B52\n',
      'xctrace version': 'xctrace version 27.2 (27B52)\n',
      'devicectl --version': '651.32\n',
    });
    assert.deepEqual(await readIosToolVersions(processes), {
      node: process.version,
      xcode: 'Xcode 27.2, Build version 27B52',
      xctrace: 'xctrace version 27.2 (27B52)',
      devicectl: '651.32',
    });
  });
});
