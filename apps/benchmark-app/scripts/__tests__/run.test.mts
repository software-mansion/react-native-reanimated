import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { MEASUREMENT_REVISION } from '../measurement-rules.mts';
import { readResult, writeResult } from '../results.mts';
import type { RunResult, MeasuredVariant } from '../results.mts';
import { resumeCommand, runCommand } from '../run.mts';
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
        outputDir: TEST_ROOT.outputDir,
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

function editResult(folder: string, edit: (result: RunResult) => void) {
  const result = readResult(folder);
  edit(result);
  writeResult(folder, result);
}

function summaryOf(folder: string) {
  return JSON.parse(fs.readFileSync(path.join(folder, 'summary.json'), 'utf8'));
}

describe('summary.json', () => {
  it('gives the status, the exit code, its reason and the verdict counts of a done run', async () => {
    const folder = await stoppedRun();
    assert.equal(await resume(folder).run, 0);
    assert.deepEqual(summaryOf(folder), {
      formatVersion: 1,
      command: 'run',
      status: 'done',
      exitCode: 0,
      reason: 'All 1 expectations hold.',
      failedExpectations: [],
      verdictCounts: { 'no change found': 14 },
      report: 'report.md',
      result: 'result.json',
    });
  });

  it('names the expectations that do not hold and the exit code of a stopped run', async () => {
    const summary = summaryOf(await stoppedRun());
    assert.equal(summary.status, 'interrupted');
    assert.equal(summary.exitCode, 130);
    assert.equal(summary.reason, 'The driver got a signal to stop.');
    assert.deepEqual(summary.failedExpectations, [
      {
        status: 'not decided',
        text: '1. all scenarios, all metrics: not worse -> not decided (idle-cost has no data)',
      },
    ]);
  });

  it('gives exit code 2 and the message of a tool error', async () => {
    const { dependencies, context } = createFake({
      batteryLevelAt: (time) => (time > 15_000 ? 79 : 80),
    });
    await assert.rejects(
      runCommand(
        {
          command: 'run',
          config: TEST_ROOT.configFile,
          device: DEVICE,
          outputDir: TEST_ROOT.outputDir,
          blocks: 1,
          keepTraces: false,
          traceProcessor: TEST_ROOT.traceProcessor,
        },
        context,
        dependencies
      ),
      /batteryLevel: 80 -> 79/
    );
    const summary = summaryOf(onlyRunFolder(TEST_ROOT));
    assert.equal(summary.status, 'tool error');
    assert.equal(summary.exitCode, 2);
    assert.match(
      summary.reason,
      /The device state changed .*batteryLevel: 80 -> 79/
    );
  });

  it('makes no run folder when the driver stops before the measurement', async () => {
    const { dependencies, context } = createFake();
    const failing = {
      ...context,
      processes: {
        run: async () => {
          throw new Error('adb is gone');
        },
      } as unknown as typeof context.processes,
    };
    await assert.rejects(
      runCommand(
        {
          command: 'run',
          config: TEST_ROOT.configFile,
          device: DEVICE,
          outputDir: TEST_ROOT.outputDir,
          blocks: 1,
          keepTraces: false,
          traceProcessor: TEST_ROOT.traceProcessor,
        },
        failing,
        dependencies
      ),
      /adb is gone/
    );
    assert.equal(fs.existsSync(TEST_ROOT.outputDir), false);
  });
});

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
      result.variants.a?.installFileSha256,
      crypto.createHash('sha256').update('apk a').digest('hex')
    );
    assert.equal(result.verdictRows.length, 7);
    assert.deepEqual(
      result.advisoryRows.map((row) => [row.scenario, row.metric]),
      [
        ['css', 'frameCyclesMedian'],
        ['css', 'frameCyclesP95'],
      ]
    );
    assert.ok(result.verdictRows.every((row) => row.scenario === 'css'));
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

describe('runCommand with noise limits', () => {
  function runWithLimits(model: string) {
    const file = path.join(TEST_ROOT.root, `limits-${model}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify({
        formatVersion: 1,
        platform: 'android',
        device: { model, deviceId: 'HW9', osBuild: 'other build' },
        measurementRevision: MEASUREMENT_REVISION,
        sources: [],
        limits: { css: { uiThreadCpu: 0.05 } },
      })
    );
    const { dependencies, context } = createFake();
    return runCommand(
      {
        command: 'run',
        config: TEST_ROOT.configFile,
        device: DEVICE,
        outputDir: TEST_ROOT.outputDir,
        blocks: 1,
        noiseLimits: file,
        keepTraces: false,
        traceProcessor: TEST_ROOT.traceProcessor,
      },
      context,
      dependencies
    );
  }

  it('uses a record of the same phone model, also of another phone and OS build', async () => {
    assert.equal(await runWithLimits(STATE.model), 0);
    const result = readResult(onlyRunFolder(TEST_ROOT));
    assert.deepEqual(result.noiseLimits?.limits, {
      css: { uiThreadCpu: 0.05 },
    });
  });

  it('stops before it builds when the record is of another phone model', async () => {
    await assert.rejects(
      runWithLimits('Other'),
      /The noise limits do not fit this run: device model Other, the run is on Pixel\./
    );
    assert.equal(fs.existsSync(TEST_ROOT.outputDir), false);
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
    assert.equal(result.verdictRows.length, 14);
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
        sample.round,
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
        sample.round,
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
        outcome.samples.map((sample) => [sample.round, sample.segment]),
      ]),
      [['idle-cost', 0, [[1, 0]]]]
    );
    const idleCostRows = result.verdictRows.filter(
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

  it('refuses a result of an unknown format version', async () => {
    const folder = await stoppedRun();
    const file = path.join(folder, 'result.json');
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const version of [2, 3, undefined]) {
      fs.writeFileSync(
        file,
        JSON.stringify({ ...stored, formatVersion: version })
      );
      await assert.rejects(
        resume(folder).run,
        new RegExp(
          `has the result format version ${version ?? 'undefined'}\\. This driver reads only version 1\\.`
        )
      );
    }
  });

  it('refuses a result with a missing or a wrong field before it uses it', async () => {
    const folder = await stoppedRun();
    editResult(folder, (result) => {
      result.segments = [];
      const [sample] = result.incompleteScenario?.samples ?? [];
      (sample as { valid: unknown }).valid = 'yes';
      delete (result.variants.a as Partial<MeasuredVariant>).installFileSha256;
    });
    await assert.rejects(resume(folder).run, (error: Error) =>
      [
        'is not a valid result',
        'result.segments must have at least one entry',
        'result.incompleteScenario.samples[0].valid must be true or false',
        'result.variants.a.installFileSha256 must be a string',
      ].every((part) => error.message.includes(part))
    );
  });

  it('refuses a run of another measurement revision', async () => {
    const folder = await stoppedRun();
    editResult(folder, (result) => {
      result.measurementRevision = 0;
    });
    await assert.rejects(
      resume(folder).run,
      new RegExp(
        `The measurement has the revision 0, and this driver has revision ${MEASUREMENT_REVISION}`
      )
    );
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
          outputDir: TEST_ROOT.outputDir,
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
    await assert.rejects(resume(folder).run, /The measurement is done/);
  });

  it('refuses another device', async () => {
    const folder = await stoppedRun();
    await assert.rejects(
      resume(folder, { state: { ...STATE, deviceId: 'OTHER' } }).run,
      /not the same as at the start of the measurement: deviceId: HW1 -> OTHER/
    );
  });

  it('refuses a build that changed', async () => {
    const folder = await stoppedRun();
    fs.writeFileSync(apkOf('b'), 'other apk');
    await assert.rejects(
      resume(folder).run,
      /The install file of variant b changed after the measurement started/
    );
  });

  it('refuses a build that does not exist any more', async () => {
    const folder = await stoppedRun();
    fs.rmSync(apkOf('a'));
    await assert.rejects(
      resume(folder).run,
      /The install file of variant a does not exist any more/
    );
  });

  it('refuses other tool versions and another device state', async () => {
    const folder = await stoppedRun();
    await assert.rejects(
      resume(folder, { toolVersion: '2.0' }).run,
      /The tool versions changed after the measurement started: adb: 1\.0 -> 2\.0/
    );
    await assert.rejects(
      resume(folder, { state: { ...STATE, brightness: 50 } }).run,
      /not the same as at the start of the measurement: brightness: 102 -> 50/
    );
    assert.equal(readResult(folder).segments.length, 1);
  });
});
