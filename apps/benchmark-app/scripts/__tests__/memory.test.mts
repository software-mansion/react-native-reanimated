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
  DEVICE,
  STATE,
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
const READING_TIMES = [60, 120, 180, 240, 300, 360, 420, 480, 540, 600];

const OPTIONS: MemoryOptions = {
  command: 'memory',
  config: TEST_ROOT.configFile,
  device: DEVICE,
  scenario: 'shared-elements',
  launches: 2,
  intervalSeconds: 60,
  durationSeconds: 600,
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

async function measureMemory(
  options: FakeOptions = {},
  memoryOptions: Partial<MemoryOptions> = {}
) {
  const { dependencies, context } = createFake(TEST_ROOT, {
    meminfo,
    ...options,
  });
  const exitCode = await memoryCommand(
    { ...OPTIONS, ...memoryOptions },
    context,
    dependencies
  );
  const folder = onlyRunFolder(TEST_ROOT);
  return { exitCode, folder, result: readMemoryResult(folder) };
}

async function failedMemoryTest(options: FakeOptions) {
  const measured = await measureMemory(options);
  assert.equal(measured.exitCode, 1);
  const [outcome] = measured.result.scenarios;
  assert.equal(outcome.samples.length, 3);
  assert.deepEqual(
    measured.result.summary.map((variant) => variant.verdict),
    ['not decided', 'not decided']
  );
  return { ...measured, outcome };
}

async function stoppedMemoryTest(interruptAtTrace = 2): Promise<string> {
  const { dependencies, context } = createFake(TEST_ROOT, {
    meminfo,
    interruptAtTrace,
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
        launch.readings.map((reading) => reading.plannedSeconds),
        READING_TIMES
      );
      assert.deepEqual(
        launch.readings.map((reading) => reading.seconds),
        READING_TIMES
      );
      assert.equal(launch.readings[0].nativeHeap, 37153);
      assert.equal(launch.readings[0].meminfoMs, 0);
      assert.equal(launch.readings[0].batteryLevel, 80);
      assert.equal(launch.readings[0].batteryTemperature, 30);
      assert.ok(launch.readings[0].frameSeconds >= launch.readings[0].seconds);
      assert.ok(launch.readings[1].frameCount > launch.readings[0].frameCount);
      assert.equal(launch.work?.metrics?.mountBatchCount, 590);
    }

    const [a, b] = result.summary;
    assert.equal(a.verdict, 'no rise found');
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
        'A variant "rises" when the `tailSlope` of each of its launches is above the slope limit (1000 kB per minute). It is "no rise found" when the `tailSlope` of each launch is at or below the limit, and "mixed" when the launches do not agree.'
      )
    );
    for (const limit of [
      '- It uses 2 launches for each variant and gives no confidence interval.',
      '- "no rise found" does not prove that there is no leak.',
      '- The test does not find a rise that is slower than the slope limit.',
      '- A late drop of memory can hide a rise.',
      '- The second half of the duration can still contain start-up effects.',
      'The frame count proves that the app drew during each interval. It does not prove that the scenario made progress during each interval.',
      'The trace after the last reading proves the work of the scenario for the last 10 s only.',
    ]) {
      assert.ok(report.includes(limit), limit);
    }
    assert.match(
      report,
      /\| A \| 2\/2 \| 170035 kB, 170035 kB \| 0 kB\/min, 0 kB\/min \| 170035 kB \| 0 kB\/min \| no rise found \|/
    );
    assert.match(report, /\| B \| 2\/2 \| .* \| 2000 kB\/min \| rises \|/);
    assert.ok(
      report.includes(
        '### Launch 1: A, segment 0, launch 0, attempt 0, valid, accepted'
      )
    );
    assert.match(
      report,
      /\| 60 \| 60\.0 \| 0 \| 60\.0 \| \d+ \| 80% \| 30 \| 170035 kB \| 37153 kB \| 9742 kB \| 26073 kB \| 30276 kB \| 485 kB \|/
    );
    assert.ok(report.includes('| late | 0 |'));
    assert.ok(report.includes('| reset | 0 |'));
    assert.ok(report.includes('| drawing | 0 |'));
  });

  it('makes a launch invalid when the app process ends during the readings and repeats that launch only', async () => {
    const { exitCode, result } = await measureMemory({ diesAtReading: 2 });
    assert.equal(exitCode, 0);
    const [first, ...others] = result.scenarios[0].samples;
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
      others.map((launch) => [
        launch.block,
        launch.attempt,
        launch.variant,
        launch.accepted,
      ]),
      [
        [0, 1, 'a', true],
        [1, 0, 'b', true],
        [2, 0, 'b', true],
        [3, 0, 'a', true],
      ]
    );
  });

  it('keeps the first two launches when the third launch is invalid', async () => {
    const { exitCode, result } = await measureMemory({ diesAtReading: 21 });
    assert.equal(exitCode, 0);
    assert.deepEqual(
      result.scenarios[0].samples.map((launch) => [
        launch.block,
        launch.attempt,
        launch.valid,
        launch.accepted,
      ]),
      [
        [0, 0, true, true],
        [1, 0, true, true],
        [2, 0, false, false],
        [2, 1, true, true],
        [3, 0, true, true],
      ]
    );
  });

  it('makes a launch invalid when gfxinfo finds no process before the first reading, and repeats it', async () => {
    const { exitCode, result } = await measureMemory({ gfxinfoNoProcessAt: 1 });
    assert.equal(exitCode, 0);
    const [first] = result.scenarios[0].samples;
    assert.ok(!first.valid && first.cause === 'crash');
    assert.equal(
      !first.valid && first.detail,
      'dumpsys gfxinfo found no process of the app (process 100)'
    );
    assert.equal(result.scenarios[0].samples.length, 5);
  });

  it('makes a launch invalid when gfxinfo gives another process', async () => {
    const { outcome } = await failedMemoryTest({ gfxinfoPid: 4321 });
    assert.deepEqual(
      outcome.failed?.causes.map((cause) => [cause.cause, cause.detail]),
      [0, 1, 2].map(() => [
        'crash',
        'dumpsys gfxinfo gives process 4321, the launch has process 100',
      ])
    );
  });

  it('makes a launch invalid with reset when the frame counter goes down', async () => {
    const { outcome } = await failedMemoryTest({
      frameCountAt: (ms) => (ms > 130_000 ? 10 : Math.floor((ms / 1000) * 60)),
    });
    assert.deepEqual(
      outcome.failed?.causes.map((cause) => cause.cause),
      ['reset', 'reset', 'reset']
    );
    assert.ok(outcome.samples.every((launch) => launch.readings.length === 3));
  });

  it('makes a launch invalid when the final trace has too few frames, and fails after 3 invalid blocks', async () => {
    const { folder, outcome } = await failedMemoryTest({
      metrics: { frameCount: 100 },
    });
    assert.ok(outcome.samples.every((launch) => launch.readings.length === 10));
    assert.deepEqual(
      outcome.failed?.causes,
      [0, 1, 2].map(() => ({
        variant: 'a',
        cause: 'frames',
        detail: '100 frames, expected at least 540',
      }))
    );
    assert.match(
      reportOf(folder),
      /\| A \| 0\/2 \| - \| - \| - \| - \| not decided \|/
    );
  });

  it('makes a launch invalid when the final trace has fewer mount batches than the scenario needs', async () => {
    const { outcome } = await failedMemoryTest({
      metrics: { mountBatchCount: 100 },
    });
    assert.deepEqual(
      outcome.failed?.causes.map((cause) => [cause.cause, cause.detail]),
      [0, 1, 2].map(() => ['work', '100 mount batches, expected at least 300'])
    );
  });

  it('makes a launch invalid with drawing when the app draws under the floor from the first reading', async () => {
    const { outcome } = await failedMemoryTest({
      frameCountAt: (ms) => Math.floor((ms / 1000) * 5),
    });
    assert.ok(outcome.samples.every((launch) => launch.readings.length === 1));
    assert.deepEqual(
      outcome.failed?.causes.map((cause) => cause.cause),
      ['drawing', 'drawing', 'drawing']
    );
    assert.match(
      outcome.failed?.causes[0].detail ?? '',
      /frames in the 60\.0 s before the reading of 60 s, expected at least 15 frames per second/
    );
  });

  it('makes a launch invalid with drawing when a later interval is under the floor', async () => {
    const { outcome } = await failedMemoryTest({
      frameCountAt: (ms) => Math.floor((Math.min(ms, 200_000) / 1000) * 60),
    });
    assert.ok(outcome.samples.every((launch) => launch.readings.length === 5));
    assert.match(
      outcome.failed?.causes[0].detail ?? '',
      /^0 frames in the 60\.0 s before the reading of 300 s/
    );
  });

  it('stores the measured time and the command time of a reading, and makes a late reading invalid', async () => {
    const { exitCode, result } = await measureMemory({
      meminfoMs: (reading) =>
        reading === 2 ? 20_000 : reading === 13 ? 31_000 : 0,
    });
    assert.equal(exitCode, 0);
    const [first, second, ...others] = result.scenarios[0].samples;
    assert.ok(first.valid && first.accepted);
    assert.equal(first.readings[1].plannedSeconds, 120);
    assert.equal(first.readings[1].seconds, 140);
    assert.equal(first.readings[1].meminfoMs, 20_000);
    assert.ok(!second.valid && second.cause === 'late');
    assert.equal(
      !second.valid && second.detail,
      'the reading of 180 s came at 211.0 s, more than 30 s late'
    );
    assert.deepEqual(
      others.map((launch) => [launch.block, launch.attempt]),
      [
        [1, 1],
        [2, 0],
        [3, 0],
      ]
    );
  });

  it('stores the battery level of each reading and does not stop when it changes', async () => {
    const { exitCode, result } = await measureMemory({
      batteryLevelAt: (time) => 80 - Math.floor(time / 600_000),
    });
    assert.equal(exitCode, 0);
    const levels = result.scenarios[0].samples.flatMap((launch) =>
      launch.readings.map((reading) => reading.batteryLevel)
    );
    assert.ok(new Set(levels).size > 1);
  });

  it('gives no verdict for a duration under 600 s and still reports the slopes', async () => {
    const { exitCode, result } = await measureMemory(
      {},
      { durationSeconds: 540 }
    );
    assert.equal(exitCode, 0);
    assert.deepEqual(
      result.summary.map((variant) => variant.verdict),
      ['not judged (duration under 600 s)', 'not judged (duration under 600 s)']
    );
    assert.ok(Math.abs((result.summary[1].tailSlopeMedian ?? 0) - 2000) < 1);
  });

  it('reads only the name, the variants and the note of the config', async () => {
    const config = path.join(TEST_ROOT.root, 'variants-only.json');
    fs.writeFileSync(
      config,
      JSON.stringify({
        name: 'leak',
        a: { reanimated: '4.7.1', worklets: '0.13.1' },
        b: { reanimated: '4.7.1', worklets: '0.13.2' },
        expect: [{ metrics: ['memoryGrowth'], is: 'notWorse' }],
        note: 'variants only',
      })
    );
    const { exitCode, result } = await measureMemory({}, { config });
    assert.equal(exitCode, 0);
    assert.deepEqual(Object.keys(result.config).sort(), [
      'a',
      'b',
      'name',
      'note',
    ]);
  });
});

describe('memoryResumeCommand', () => {
  it('continues a stopped memory test with the launch in progress, keeps the valid launches and accepts another battery level', async () => {
    const folder = await stoppedMemoryTest(3);
    const stopped = readMemoryResult(folder);
    assert.equal(stopped.status, 'interrupted');
    assert.deepEqual(
      stopped.incompleteScenario?.samples.map((launch) => [
        launch.block,
        launch.accepted,
      ]),
      [
        [0, true],
        [1, true],
      ]
    );
    assert.ok(reportOf(folder).includes('This test is not complete'));

    const { context, dependencies } = createFake(TEST_ROOT, {
      meminfo,
      state: { ...STATE, batteryLevel: 70 },
    });
    assert.equal(
      await memoryResumeCommand(
        {
          command: 'memory-resume',
          folder,
          device: DEVICE,
          traceProcessor: TEST_ROOT.traceProcessor,
        },
        context,
        dependencies
      ),
      0
    );
    const result = readMemoryResult(folder);
    assert.equal(result.status, 'done');
    assert.deepEqual(
      result.scenarios[0].samples.map((launch) => [
        launch.block,
        launch.segment,
        launch.variant,
      ]),
      [
        [0, 0, 'a'],
        [1, 0, 'b'],
        [2, 1, 'b'],
        [3, 1, 'a'],
      ]
    );
    assert.deepEqual(result.abandonedScenarios, []);
    assert.deepEqual(
      result.summary.map((variant) => variant.verdict),
      ['no rise found', 'rises']
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
          device: DEVICE,
          traceProcessor: TEST_ROOT.traceProcessor,
        },
        context,
        dependencies
      ),
      /holds the result of the memory command, not of the run command/
    );
  });
});
