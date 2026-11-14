import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { readResult, writeResult } from '../results.mts';
import type { RunResult, RunVariant } from '../results.mts';
import { resumeCommand, runCommand } from '../run.mts';
import type { SampleRecord } from '../session.mts';
import {
  DEVICE,
  STATE,
  createFake as createCommandFake,
  onlyRunFolder,
  useTestRoot,
} from './command-fake.mts';
import type { FakeOptions } from './command-fake.mts';

const TEST_ROOT = useTestRoot('run', {
  name: 'resume-test',
  a: { reanimated: '4.7.1', worklets: '0.13.1' },
  b: { reanimated: '4.7.1', worklets: '0.13.1' },
  scenarios: ['css', 'idle-cost'],
  blocks: { 'idle-cost': 2 },
});
const { apkOf } = TEST_ROOT;

function createFake(options: FakeOptions = {}) {
  return createCommandFake(TEST_ROOT, options);
}

async function stoppedRun({
  interruptAtTrace = 6,
  keepTraces = false,
} = {}): Promise<string> {
  const { dependencies, context } = createFake({ interruptAtTrace });
  await assert.rejects(
    runCommand(
      {
        command: 'run',
        config: TEST_ROOT.configFile,
        device: DEVICE,
        blocks: 1,
        keepTraces,
        traceProcessor: TEST_ROOT.traceProcessor,
      },
      context,
      dependencies
    ),
    /the device connection ended/
  );
  return onlyRunFolder(TEST_ROOT);
}

function resume(folder: string, options: FakeOptions = {}, device = DEVICE) {
  const { dependencies, context, installs } = createFake(options);
  return {
    installs,
    run: resumeCommand(
      {
        command: 'resume',
        folder,
        device,
        traceProcessor: TEST_ROOT.traceProcessor,
      },
      context,
      dependencies
    ),
  };
}

function failedOnlyOnMemoryGrowth(result: Pick<RunResult, 'statistics'>) {
  const memory = result.statistics.find((row) => row.metric === 'memory');
  assert.ok(memory);
  const growth = { ...memory, metric: 'memoryGrowth', verdict: 'worse' };
  return {
    expectation: {
      scenarios: ['css'],
      metrics: ['memory', 'memoryGrowth'],
      is: 'notWorse',
    },
    status: 'fails',
    rows: [memory, growth],
    decidingRows: [growth],
    failedScenarios: [],
    scenariosWithoutData: [],
  };
}

function editResult(folder: string, edit: (result: RunResult) => void) {
  const result = readResult(folder);
  edit(result);
  writeResult(folder, result);
}

describe('a stopped run', () => {
  it('keeps the samples of the scenario in progress and writes a provisional report', async () => {
    const folder = await stoppedRun();
    const result = readResult(folder);
    assert.equal(result.status, 'interrupted');
    assert.deepEqual(
      result.scenarios.map((outcome) => outcome.scenario),
      ['css']
    );
    assert.equal(result.incompleteScenario?.scenario, 'idle-cost');
    assert.equal(result.incompleteScenario?.samples.length, 1);
    assert.equal(result.segments[0].status, 'interrupted');
    assert.equal(result.appRefreshRate, 60);
    assert.equal(
      result.variants.a?.artifactSha256,
      crypto.createHash('sha256').update('apk a').digest('hex')
    );
    assert.equal(result.statistics.length, 7);
    assert.ok(result.statistics.every((row) => row.scenario === 'css'));
    assert.equal(result.expectations[0].status, 'not decided');
    assert.deepEqual(result.expectations[0].scenariosWithoutData, [
      'idle-cost',
    ]);
    const report = fs.readFileSync(path.join(folder, 'report.md'), 'utf8');
    assert.ok(
      report.includes(
        'This run is not complete (status: interrupted). Scenarios without data: idle-cost.'
      )
    );
  });
});

describe('resumeCommand', () => {
  it('measures the block in progress again and keeps its samples as abandoned', async () => {
    const folder = await stoppedRun();
    const { run, installs } = resume(folder);
    assert.equal(await run, 0);
    const result = readResult(folder);
    assert.equal(result.status, 'done');
    assert.deepEqual(
      result.scenarios.map((outcome) => [
        outcome.scenario,
        outcome.samples.length,
      ]),
      [
        ['css', 4],
        ['idle-cost', 8],
      ]
    );
    assert.equal(result.incompleteScenario, null);
    assert.deepEqual(
      result.abandonedScenarios.map((outcome) => [
        outcome.scenario,
        outcome.segment,
        outcome.samples.length,
      ]),
      [['idle-cost', 0, 1]]
    );
    assert.deepEqual(
      result.segments.map((segment) => segment.status),
      ['interrupted', 'done']
    );
    assert.equal(result.statistics.length, 14);
    assert.deepEqual(installs, [apkOf('a'), apkOf('b')]);
    const report = fs.readFileSync(path.join(folder, 'report.md'), 'utf8');
    assert.ok(!report.includes('not complete'));
    assert.match(report, /\| 1 \| \S+ \| \S+ \| done \| 80% \| 30 °C \|/);
    assert.ok(
      fs
        .readdirSync(path.join(folder, 'traces'))
        .every((file) => !file.endsWith('.perfetto-trace'))
    );
  });

  it('keeps the accepted blocks of the incomplete scenario', async () => {
    const folder = await stoppedRun({ interruptAtTrace: 10, keepTraces: true });
    assert.deepEqual(
      readResult(folder).incompleteScenario?.samples.map((sample) => [
        sample.block,
        sample.segment,
        sample.accepted,
      ]),
      [
        [0, 0, true],
        [0, 0, true],
        [0, 0, true],
        [0, 0, true],
        [1, 0, false],
      ]
    );
    assert.equal(await resume(folder).run, 0);
    const result = readResult(folder);
    const idleCost = result.scenarios.find(
      (outcome) => outcome.scenario === 'idle-cost'
    );
    assert.deepEqual(
      idleCost?.samples.map((sample) => [
        sample.block,
        sample.segment,
        sample.attempt,
        sample.accepted,
      ]),
      [
        ...[0, 0, 0, 0].map((block) => [block, 0, 0, true]),
        ...[1, 1, 1, 1].map((block) => [block, 1, 0, true]),
      ]
    );
    assert.deepEqual(
      result.abandonedScenarios.map((outcome) => [
        outcome.scenario,
        outcome.segment,
        outcome.samples.map((sample) => [sample.block, sample.segment]),
      ]),
      [['idle-cost', 0, [[1, 0]]]]
    );
    const idleCostRows = result.statistics.filter(
      (row) => row.scenario === 'idle-cost'
    );
    assert.equal(idleCostRows.length, 7);
    assert.ok(
      idleCostRows.every((row) => row.samplesA === 4 && row.samplesB === 4)
    );
    const traces = [...result.scenarios, ...result.abandonedScenarios].flatMap(
      (outcome) => outcome.samples.map((sample) => sample.trace)
    );
    assert.equal(new Set(traces).size, 13);
    assert.equal(
      fs
        .readdirSync(path.join(folder, 'traces'))
        .filter((file) => file.endsWith('.perfetto-trace')).length,
      13
    );
    const report = fs.readFileSync(path.join(folder, 'report.md'), 'utf8');
    assert.ok(
      report.includes(
        '- idle-cost: block 0 in segment 0, block 1 in segment 1.'
      )
    );
  });

  it('reads a result without sample segments', async () => {
    const folder = await stoppedRun({ interruptAtTrace: 10 });
    editResult(folder, (result) => {
      result.segments.push({ ...result.segments[0] });
      for (const outcome of [result.scenarios[0], result.incompleteScenario]) {
        outcome?.samples.forEach(
          (sample) => delete (sample as Partial<SampleRecord>).segment
        );
      }
    });
    const result = readResult(folder);
    assert.ok(
      result.scenarios[0].samples.every((sample) => sample.segment === 0)
    );
    assert.ok(
      result.incompleteScenario?.samples.every((sample) => sample.segment === 1)
    );
  });

  it('resumes a run of result format 1 with the old metric memoryGrowth', async () => {
    const folder = await stoppedRun({ interruptAtTrace: 10 });
    const file = path.join(folder, 'result.json');
    const {
      command: _command,
      platform: _platform,
      ...current
    } = readResult(folder);
    const formatOne = {
      ...current,
      formatVersion: 1,
      variants: Object.fromEntries(
        Object.entries(current.variants).map(
          ([key, { artifact, artifactSha256, ...variant }]) => [
            key,
            { ...variant, apk: artifact, apkSha256: artifactSha256 },
          ]
        )
      ),
      config: {
        ...current.config,
        expect: [
          { scenarios: ['css'], metrics: ['memoryGrowth'], is: 'notWorse' },
          ...current.config.expect.map((expectation) => ({
            ...expectation,
            metrics: [...expectation.metrics, 'memoryGrowth'],
          })),
        ],
      },
      noiseLimits: { css: { memory: 0.03, memoryGrowth: 4000 } },
      statistics: [
        ...current.statistics,
        { ...current.statistics[0], metric: 'memoryGrowth' },
      ],
      expectations: [
        failedOnlyOnMemoryGrowth(current),
        ...current.expectations.map((expectation) => ({
          ...expectation,
          expectation: {
            ...expectation.expectation,
            metrics: [...expectation.expectation.metrics, 'memoryGrowth'],
          },
          rows: [
            ...expectation.rows,
            { ...current.statistics[0], metric: 'memoryGrowth' },
          ],
        })),
      ],
    };
    fs.writeFileSync(
      file,
      JSON.stringify(formatOne).replaceAll(
        '"windowMemoryDelta"',
        '"memoryGrowth"'
      )
    );

    const upgraded = readResult(folder);
    assert.equal(upgraded.statistics.length, current.statistics.length);
    assert.equal(upgraded.expectations[0].status, 'holds');
    assert.deepEqual(upgraded.expectations[0].decidingRows, []);
    assert.ok(
      !JSON.stringify(upgraded).includes('memoryGrowth'),
      'the upgraded result has no memoryGrowth'
    );

    assert.equal(await resume(folder).run, 0);
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!text.includes('memoryGrowth'));
    const result = readResult(folder);
    assert.equal(result.formatVersion, 3);
    assert.equal(result.platform, 'android');
    assert.equal(result.command, 'run');
    assert.deepEqual(result.noiseLimits, { css: { memory: 0.03 } });
    assert.equal(result.config.expect.length, 1);
    assert.ok(
      result.scenarios
        .flatMap((outcome) => outcome.samples)
        .every((sample) => sample.metrics?.windowMemoryDelta === 100)
    );
    assert.equal(result.expectations[0].status, 'holds');
  });

  it('stops a run when the battery level changes', async () => {
    const { dependencies, context } = createFake({
      batteryLevelAt: (time) => (time > 15_000 ? 79 : 80),
    });
    await assert.rejects(
      runCommand(
        {
          command: 'run',
          config: TEST_ROOT.configFile,
          device: DEVICE,
          blocks: 1,
          keepTraces: false,
          traceProcessor: TEST_ROOT.traceProcessor,
        },
        context,
        dependencies
      ),
      /batteryLevel: 80 -> 79/
    );
  });

  it('closes a segment that ended without cleanup', async () => {
    const folder = await stoppedRun();
    editResult(folder, (result) => {
      result.status = 'running';
      result.segments[0].status = 'running';
    });
    await resume(folder).run;
    assert.deepEqual(
      readResult(folder).segments.map((segment) => segment.status),
      ['interrupted', 'done']
    );
  });

  it('refuses a run that is done', async () => {
    const folder = await stoppedRun();
    await resume(folder).run;
    await assert.rejects(resume(folder).run, /The run is done/);
  });

  it('refuses another device', async () => {
    const folder = await stoppedRun();
    await assert.rejects(
      resume(folder, { state: { ...STATE, hardwareSerial: 'OTHER' } }).run,
      /not the same as at the start of the run: hardwareSerial: HW1 -> OTHER/
    );
  });

  it('refuses a build that changed or a run folder without the build hash', async () => {
    const folder = await stoppedRun();
    fs.writeFileSync(apkOf('b'), 'other apk');
    await assert.rejects(
      resume(folder).run,
      /The build of variant b changed after the run started/
    );
    editResult(folder, (result) => {
      delete (result.variants.a as Partial<RunVariant>).artifactSha256;
    });
    await assert.rejects(
      resume(folder).run,
      /no build hash of variant a\. This run cannot resume/
    );
  });

  it('refuses a build that does not exist any more', async () => {
    const folder = await stoppedRun();
    fs.rmSync(apkOf('a'));
    await assert.rejects(
      resume(folder).run,
      /The build of variant a does not exist any more/
    );
  });

  it('refuses other tool versions and another device state', async () => {
    const folder = await stoppedRun();
    await assert.rejects(
      resume(folder, { toolVersion: '2.0' }).run,
      /The tool versions changed after the run started: adb: 1\.0 -> 2\.0/
    );
    await assert.rejects(
      resume(folder, { state: { ...STATE, brightness: 50 } }).run,
      /not the same as at the start of the run: brightness: 102 -> 50/
    );
    assert.equal(readResult(folder).segments.length, 1);
  });
});
