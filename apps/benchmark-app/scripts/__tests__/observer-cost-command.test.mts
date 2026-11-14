import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { IOS_DEFINITION } from '../ios-definition.mts';
import { NOISE_LIMITS_FORMAT_VERSION } from '../noise-limits-record.mts';
import type { NoiseLimitsRecord } from '../noise-limits-record.mts';
import { observerCostCommand } from '../observer-cost-command.mts';
import { readObserverCostResult } from '../validation-sources.mts';
import { useTestRoot } from './command-fake.mts';
import {
  APP_BUILD,
  clockWithEndlessPolls,
  commandContext,
  fakeIosDevice,
  launchLine,
  readyLine,
} from './ios-device-fake.mts';
import { endpointsSample, sampleLine } from './ios-fixtures.mts';

const TEST_ROOT = useTestRoot('observer-cost-command', {});
const APP = 'com.reanimatedbenchmark.a';
const SCENARIO = 'idle-cost';
const LIMITS_FILE = path.join(TEST_ROOT.root, 'noise-limits.json');

const RECORD: NoiseLimitsRecord = {
  formatVersion: NOISE_LIMITS_FORMAT_VERSION,
  platform: 'ios',
  device: {
    model: 'iPhone 14 (iPhone14,7)',
    deviceId: 'UDID1',
    osBuild: '24A446',
  },
  measurementRevision: IOS_DEFINITION.measurementRevision,
  sources: [],
  scenarios: { [SCENARIO]: { version: 1, load: 80 } },
  limits: {
    [SCENARIO]: { uiThreadCpu: 0.08, jsThreadCpu: 0.08 },
  },
};

function observerCost(
  noiseLimits: string | undefined,
  readyAt: (launch: number) => string = () => readyLine(SCENARIO)
) {
  const { device } = fakeIosDevice((launch, { plan }) => ({
    lines: [
      launchLine(),
      readyAt(launch),
      plan?.epochs[0].collector === 'endpoints'
        ? sampleLine(endpointsSample())
        : sampleLine(),
    ],
  }));
  return observerCostCommand(
    {
      command: 'observer-cost',
      device: { platform: 'ios', id: 'UDID1' },
      applicationId: APP,
      scenario: SCENARIO,
      blocks: 5,
      noiseLimits,
      outputDir: TEST_ROOT.outputDir,
    },
    commandContext(),
    { createDevice: () => device, clock: clockWithEndlessPolls() }
  );
}

function onlyFolder(): string {
  const [folder] = fs.readdirSync(TEST_ROOT.outputDir);
  return path.join(TEST_ROOT.outputDir, folder);
}

function onlyResult() {
  return readObserverCostResult(onlyFolder()).result;
}

describe('observerCostCommand', () => {
  it('passes only the verdict metrics that the noise limits validate', async () => {
    fs.writeFileSync(LIMITS_FILE, JSON.stringify(RECORD));
    assert.equal(await observerCost(LIMITS_FILE), 0);
    const result = onlyResult();
    assert.equal(result.samples.length, 20);
    assert.equal(result.appBuild, APP_BUILD);
    assert.deepEqual(result.report, { version: 1, load: 80 });
    assert.deepEqual(
      result.costs?.map((cost) => [cost.metric, cost.outcome]),
      [
        ['uiThreadCpu', 'passed'],
        ['jsThreadCpu', 'passed'],
        ['processCpu', 'not validated'],
        ['memory', 'not validated'],
      ]
    );
  });

  it('does not pass a test without noise limits', async () => {
    assert.equal(await observerCost(undefined), 1);
    assert.ok(
      onlyResult().costs?.every((cost) => cost.outcome === 'not validated')
    );
  });

  it('stops when a launch reports a scenario version or load that the noise limits do not have', async () => {
    fs.writeFileSync(LIMITS_FILE, JSON.stringify(RECORD));
    await assert.rejects(
      observerCost(LIMITS_FILE, (launch) =>
        readyLine(SCENARIO, launch === 3 ? 2 : 1)
      ),
      /The noise limits of idle-cost are of the scenario version 1 with the load 80, but the app reports the version 2 with the load 80/
    );
    assert.throws(
      () => onlyResult(),
      /is not a complete validation result:\n {2}- observer-cost\.costs must be a list/
    );
    const stored = JSON.parse(
      fs.readFileSync(path.join(onlyFolder(), 'observer-cost.json'), 'utf8')
    );
    assert.equal(stored.samples.length, 2);
    fs.rmSync(TEST_ROOT.outputDir, { recursive: true });
    await assert.rejects(
      observerCost(LIMITS_FILE, () => readyLine(SCENARIO, 1, 40)),
      /but the app reports the version 1 with the load 40/
    );
  });
});
