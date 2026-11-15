import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { IOS_DEFINITION } from '../ios-definition.mts';
import { knownWorkCommand } from '../known-work-command.mts';
import { KNOWN_WORK_PLAN, KNOWN_WORK_SCENARIO } from '../known-work.mts';
import { readKnownWorkResult } from '../validation-sources.mts';
import { useTestRoot } from './command-fake.mts';
import {
  APP_BUILD,
  clockWithEndlessPolls,
  commandContext,
  fakeIosDevice,
  launchLine,
  readyLine,
} from './ios-device-fake.mts';
import { inAppSample, sampleLine, steadyUpdates } from './ios-fixtures.mts';
import {
  knownWorkBoundaries,
  knownWorkEpochs,
} from './validation-fixtures.mts';

const TEST_ROOT = useTestRoot('known-work-command', {});
const APP = 'com.reanimatedbenchmark.a';

function knownWork(
  extraInstructions?: (load: string) => number,
  endsAfterLines = false
) {
  const plans: unknown[] = [];
  const { device, calls } = fakeIosDevice((_, { plan }) => {
    plans.push(plan);
    return {
      lines: [
        launchLine(),
        readyLine(KNOWN_WORK_SCENARIO),
        ...(endsAfterLines
          ? []
          : [
              sampleLine(
                inAppSample({
                  epochs: knownWorkEpochs(),
                  boundaries: knownWorkBoundaries(extraInstructions),
                  updates: steadyUpdates(0),
                })
              ),
            ]),
      ],
      endsAfterLines,
    };
  });
  const result = knownWorkCommand(
    {
      command: 'known-work',
      device: { platform: 'ios', id: 'UDID1' },
      applicationId: APP,
      outputDir: TEST_ROOT.outputDir,
    },
    commandContext(),
    { createDevice: () => device, clock: clockWithEndlessPolls() }
  );
  return { result, plans, calls };
}

function onlyFolder(): string {
  const folders = fs.readdirSync(TEST_ROOT.outputDir);
  assert.equal(folders.length, 1);
  return path.join(TEST_ROOT.outputDir, folders[0]);
}

describe('knownWorkCommand', () => {
  it('launches the validation scenario with the known-work plan and writes a result that the reader accepts', async () => {
    const { result, plans } = knownWork();
    assert.equal(await result, 0);
    assert.deepEqual(plans, [KNOWN_WORK_PLAN]);
    const stored = readKnownWorkResult(onlyFolder()).result;
    assert.equal(stored.appBuild, APP_BUILD);
    assert.equal(
      stored.measurementRevision,
      IOS_DEFINITION.measurementRevision
    );
    assert.equal(stored.scenario, KNOWN_WORK_SCENARIO);
    assert.ok(stored.gates.every((gate) => gate.passes));
    assert.ok(
      fs
        .readFileSync(path.join(onlyFolder(), 'known-work.md'), 'utf8')
        .includes('| `known-work-double` against `known-work` (linearity) |')
    );
  });

  it('gives the exit code 1 when a gate fails', async () => {
    fs.rmSync(TEST_ROOT.outputDir, { recursive: true, force: true });
    const { result } = knownWork((load) =>
      load === 'known-work-background' ? 60_000_000 : 0
    );
    assert.equal(await result, 1);
    const failed = readKnownWorkResult(onlyFolder())
      .result.gates.filter((gate) => !gate.passes)
      .map((gate) => gate.name);
    assert.deepEqual(failed, [
      '`known-work-background` (background QoS) against `known-work` (user-interactive QoS)',
    ]);
  });

  it('is a tool error when the app gives no SAMPLE line, and it stops the app', async () => {
    fs.rmSync(TEST_ROOT.outputDir, { recursive: true, force: true });
    const { result, calls } = knownWork(undefined, true);
    await assert.rejects(
      result,
      /The app gave no SAMPLE line: the app process 812 ended before its SAMPLE line/
    );
    assert.equal(calls.at(-1), `terminate ${APP}`);
  });
});
