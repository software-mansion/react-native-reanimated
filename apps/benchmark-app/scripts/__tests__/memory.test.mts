import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { MemoryOptions } from '../arguments.mts';
import { memoryCommand, memoryResumeCommand } from '../memory.mts';
import type { MemoryResult } from '../memory.mts';
import { readMeasurementResult } from '../results.mts';
import { resumeCommand } from '../run.mts';
import {
  SERIAL,
  createFake,
  onlyRunFolder,
  useTestRoot,
} from './command-fake.mts';
import type { FakeOptions } from './command-fake.mts';

const TEST_ROOT = useTestRoot('memory', {
  name: 'leak',
  a: { reanimated: '4.7.1', worklets: '0.13.1' },
  b: { reanimated: '4.7.1', worklets: '0.13.2' },
  scenarios: ['css'],
});

const MEMINFO = fs.readFileSync(
  path.join(import.meta.dirname, 'fixtures', 'meminfo.txt'),
  'utf8'
);

const B_RISE_PER_MINUTE = 2000;

const OPTIONS: MemoryOptions = {
  command: 'memory',
  config: TEST_ROOT.configFile,
  serial: SERIAL,
  scenario: 'shared-elements',
  launches: 2,
  intervalSeconds: 60,
  durationSeconds: 240,
  slopeLimit: 1000,
  keepTraces: false,
  traceProcessor: TEST_ROOT.traceProcessor,
};

function meminfo(applicationId: string, msAfterStart: number): string {
  const rise = applicationId.endsWith('.b')
    ? Math.round((msAfterStart / 60_000) * B_RISE_PER_MINUTE)
    : 0;
  return MEMINFO.replace(
    'TOTAL PSS:   170035',
    `TOTAL PSS:   ${170035 + rise}`
  );
}

async function measureMemory(options: FakeOptions = {}) {
  const { dependencies, context } = createFake(TEST_ROOT, {
    meminfo,
    ...options,
  });
  const exitCode = await memoryCommand(OPTIONS, context, dependencies);
  const folder = onlyRunFolder(TEST_ROOT);
  return { exitCode, folder, result: readMemoryResult(folder) };
}

async function stoppedMemoryTest(): Promise<string> {
  const { dependencies, context } = createFake(TEST_ROOT, {
    meminfo,
    interruptAtTrace: 2,
  });
  await assert.rejects(
    memoryCommand(OPTIONS, context, dependencies),
    /the device connection ended/
  );
  return onlyRunFolder(TEST_ROOT);
}

function readMemoryResult(folder: string): MemoryResult {
  return readMeasurementResult<MemoryResult>(folder, 'memory');
}

function reportOf(folder: string): string {
  return fs.readFileSync(path.join(folder, 'report.md'), 'utf8');
}

describe('memoryCommand', () => {
  it('reads the series of each launch in the order A, B, B, A and gives a verdict for each variant', async () => {
    const { exitCode, folder, result } = await measureMemory();
    assert.equal(exitCode, 0);
    assert.equal(result.status, 'done');
    assert.equal(
      path.basename(folder).endsWith('-leak-memory-shared-elements'),
      true
    );
    const [outcome] = result.scenarios;
    assert.equal(outcome.scenario, 'shared-elements');
    assert.equal(
      outcome.samples.map((launch) => launch.variant).join(''),
      'abba'
    );
    for (const launch of outcome.samples) {
      assert.ok(launch.valid && launch.accepted);
      assert.deepEqual(
        launch.readings.map((reading) => reading.seconds),
        [60, 120, 180, 240]
      );
      assert.equal(launch.readings[0].nativeHeap, 37153);
      assert.equal(launch.work?.metrics?.mountBatchCount, 590);
    }

    const [a, b] = result.summary;
    assert.equal(a.verdict, 'stable');
    assert.equal(a.tailLevelMedian, 170035);
    assert.equal(a.tailSlopeMedian, 0);
    assert.equal(b.verdict, 'rises');
    assert.equal(b.launches.length, 2);
    assert.ok(
      b.launches.every(
        (launch) => Math.abs(launch.tailSlope - B_RISE_PER_MINUTE) < 1
      )
    );

    const report = reportOf(folder);
    assert.ok(report.startsWith('# Memory test leak: shared-elements'));
    assert.ok(report.includes('| worklets source | 0.13.1 | 0.13.2 |'));
    assert.ok(
      report.includes(
        'A variant "rises" when the `tailSlope` of each of its launches is above the slope limit (1000 kB per minute). Else it is "stable".'
      )
    );
    assert.match(
      report,
      /\| A \| 2\/2 \| 170035 kB, 170035 kB \| 0 kB\/min, 0 kB\/min \| 170035 kB \| 0 kB\/min \| stable \|/
    );
    assert.match(report, /\| B \| 2\/2 \| .* \| 2000 kB\/min \| rises \|/);
    assert.ok(
      report.includes(
        '### Launch 1: A, segment 0, block 0, attempt 0, position 0, valid, accepted'
      )
    );
    assert.ok(
      report.includes(
        '| 60 | 170035 kB | 37153 kB | 9742 kB | 26073 kB | 30276 kB | 485 kB |'
      )
    );
  });

  it('makes a launch invalid when the app process ends during the readings and launches the block again', async () => {
    const { exitCode, result } = await measureMemory({ diesAtReading: 2 });
    assert.equal(exitCode, 0);
    const [first, ...others] = result.scenarios[0].samples;
    assert.equal(first.valid, false);
    assert.ok(!first.valid && first.cause === 'crash');
    assert.equal(
      !first.valid && first.detail,
      'the app process 100 died during the memory readings'
    );
    assert.deepEqual(
      first.readings.map((reading) => reading.seconds),
      [60]
    );
    assert.deepEqual(
      others.map((launch) => [launch.attempt, launch.valid, launch.accepted]),
      [0, 1, 2, 3].map(() => [1, true, true])
    );
  });

  it('makes a launch invalid when the work check at the end fails, and fails after 3 invalid blocks', async () => {
    const { exitCode, folder, result } = await measureMemory({
      metrics: { frameCount: 100 },
    });
    assert.equal(exitCode, 1);
    const [outcome] = result.scenarios;
    assert.equal(outcome.samples.length, 3);
    assert.ok(outcome.samples.every((launch) => launch.readings.length === 4));
    assert.deepEqual(outcome.failed?.causes, [
      {
        variant: 'a',
        cause: 'frames',
        detail: '100 frames, expected at least 540',
      },
      {
        variant: 'a',
        cause: 'frames',
        detail: '100 frames, expected at least 540',
      },
      {
        variant: 'a',
        cause: 'frames',
        detail: '100 frames, expected at least 540',
      },
    ]);
    assert.deepEqual(
      result.summary.map((variant) => variant.verdict),
      ['not decided', 'not decided']
    );
    assert.match(
      reportOf(folder),
      /\| A \| 0\/2 \| - \| - \| - \| - \| not decided \|/
    );
  });
});

describe('memoryResumeCommand', () => {
  it('continues a stopped memory test and keeps the launch in progress as abandoned', async () => {
    const folder = await stoppedMemoryTest();
    const stopped = readMemoryResult(folder);
    assert.equal(stopped.status, 'interrupted');
    assert.equal(stopped.incompleteScenario?.samples.length, 1);
    assert.ok(reportOf(folder).includes('This test is not complete'));

    const { context, dependencies } = createFake(TEST_ROOT, { meminfo });
    assert.equal(
      await memoryResumeCommand(
        {
          command: 'memory-resume',
          folder,
          serial: SERIAL,
          traceProcessor: TEST_ROOT.traceProcessor,
        },
        context,
        dependencies
      ),
      0
    );
    const result = readMemoryResult(folder);
    assert.equal(result.status, 'done');
    assert.equal(result.scenarios[0].samples.length, 4);
    assert.deepEqual(
      result.abandonedScenarios.map((outcome) => [
        outcome.segment,
        outcome.samples.length,
      ]),
      [[0, 1]]
    );
    assert.deepEqual(
      result.summary.map((variant) => variant.verdict),
      ['stable', 'rises']
    );
  });

  it('is not a run: run --resume refuses a memory test folder', async () => {
    const folder = await stoppedMemoryTest();
    const { context, dependencies } = createFake(TEST_ROOT, { meminfo });
    await assert.rejects(
      resumeCommand(
        {
          command: 'resume',
          folder,
          serial: SERIAL,
          traceProcessor: TEST_ROOT.traceProcessor,
        },
        context,
        dependencies
      ),
      /holds the result of the memory command, not of the run command/
    );
  });
});
