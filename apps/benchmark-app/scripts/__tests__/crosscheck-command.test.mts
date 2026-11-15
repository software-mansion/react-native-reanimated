import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { CrosscheckOptions } from '../arguments.mts';
import { crosscheckCommand } from '../crosscheck-command.mts';
import type { CrosscheckDependencies } from '../crosscheck-command.mts';
import { ToolError } from '../errors.mts';
import type { SampleEpoch } from '../in-app-sample.mts';
import {
  buildValidationRecord,
  readValidationRecord,
} from '../validation-record.mts';
import {
  identityOf,
  readCrosscheckResult,
  readObserverCostResult,
} from '../validation-sources.mts';
import type { TraceExports } from '../xctrace-metrics.mts';
import type { IosTracer, TraceRecording } from '../xctrace.mts';
import { useTestRoot } from './command-fake.mts';
import {
  clockWithEndlessPolls,
  commandContext,
  fakeIosDevice,
  launchLine,
  readyLine,
} from './ios-device-fake.mts';
import type { FakeLaunch } from './ios-device-fake.mts';
import { inAppSample, sampleLine } from './ios-fixtures.mts';
import { validationSources } from './validation-fixtures.mts';
import {
  TRACE_EXPORTS,
  traceRowsOf,
  withRows,
  withoutRows,
} from './xctrace-fixtures.mts';

const TEST_ROOT = useTestRoot('crosscheck-command', {});
const APP = 'com.reanimatedbenchmark.a';

const PID = 812;

const MAIN_THREAD = 5001;

const JS_THREAD = 5002;

const OTHER_THREAD = 5003;

const TRACE_OFFSET_NS = 1_000_000_000;

const STEADY_EPOCH: SampleEpoch = {
  load: 'steady',
  collector: 'full',
  seconds: 10,
};

const STEADY_SAMPLE = inAppSample({
  epochs: [{ ...STEADY_EPOCH, work: { own: 0, other: 0 } }],
});

function crosscheck(
  launch: FakeLaunch,
  record: (recording: TraceRecording) => Promise<void>,
  exports: TraceExports | null = null,
  scenario = 'crosscheck-load',
  epochs: SampleEpoch[] = [{ load: 'idle', collector: 'full', seconds: 2.5 }]
) {
  const { device, calls } = fakeIosDevice(() => launch);
  const tracer: IosTracer = {
    record,
    collect: async () => {
      if (exports === null) {
        throw new ToolError('no trace to collect');
      }
      return exports;
    },
  };
  const dependencies: CrosscheckDependencies = {
    createDevice: () => device,
    createTracer: () => tracer,
    clock: clockWithEndlessPolls(),
  };
  const options: CrosscheckOptions = {
    command: 'crosscheck',
    device: { platform: 'ios', id: 'UDID1' },
    applicationId: APP,
    scenario,
    epochs,
    outputDir: TEST_ROOT.outputDir,
  };
  return {
    calls,
    result: crosscheckCommand(options, commandContext(), dependencies),
  };
}

function steadyRecording(): TraceExports {
  const rows = traceRowsOf(PID);
  const at = (appNs: number) => TRACE_OFFSET_NS + appNs;
  const thread = (id: number, runStartNs: number, runNs: number) => [
    rows.threadRow({
      start: at(-1_000_000),
      thread: id,
      state: 'Blocked',
      duration: runStartNs + 1_000_000,
    }),
    rows.threadRow({
      start: at(runStartNs),
      thread: id,
      state: 'Running',
      duration: runNs,
    }),
    rows.threadRow({
      start: at(runStartNs + runNs),
      thread: id,
      state: 'Blocked',
      duration: 11_000_000_000 - runStartNs - runNs,
    }),
  ];
  const updateStarts = STEADY_SAMPLE.updates.beginNs.map(at);
  const footprint = (startNs: number, kb: number) =>
    rows.footprintRow(at(startNs), kb * 1024, PID, 100_000_000);
  return {
    threadState: withRows(withoutRows(TRACE_EXPORTS.threadState), [
      ...thread(MAIN_THREAD, 2_500, 3_500_000_000),
      ...thread(JS_THREAD, 1_000_000_000, 20_000_000),
      rows.threadRow({
        start: at(2_000_000_000),
        thread: OTHER_THREAD,
        state: 'Running',
        duration: 10_000_000,
      }),
    ]),
    frames: withRows(
      withoutRows(TRACE_EXPORTS.frames),
      updateStarts.map((start) => rows.intervalRow(start, 6_000_000))
    ),
    signposts: withRows(withoutRows(TRACE_EXPORTS.signposts), [
      ...STEADY_SAMPLE.boundaries.map((boundary, index) =>
        rows.boundaryRow(
          at((boundary.signpostStartNs + boundary.signpostEndNs) / 2),
          index
        )
      ),
      ...updateStarts.map((start) => rows.mountRow(start)),
    ]),
    processes: withRows(TRACE_EXPORTS.processes, [
      footprint(-500_000_000, 40_000),
      footprint(500_000_000, 40_000),
      footprint(9_500_000_000, 40_300),
      footprint(10_500_000_000, 40_300),
    ]),
  };
}

describe('crosscheckCommand', () => {
  it('writes a result that the reader accepts and that a validation record keeps as a source with no gate', async () => {
    const { result } = crosscheck(
      {
        lines: [
          launchLine(),
          readyLine('worklet-styles-transform'),
          sampleLine(STEADY_SAMPLE),
        ],
      },
      async ({ onRecording }) => onRecording(),
      steadyRecording(),
      'worklet-styles-transform',
      [STEADY_EPOCH]
    );
    assert.equal(await result, 0);
    const [folder] = fs
      .readdirSync(TEST_ROOT.outputDir)
      .filter((name) => name.endsWith('-crosscheck-worklet-styles-transform'));
    const source = readCrosscheckResult(path.join(TEST_ROOT.outputDir, folder));
    const [epoch] = source.result.epochs;
    assert.deepEqual(source.result.clock, {
      offsetNs: TRACE_OFFSET_NS,
      uncertaintyNs: 3_000,
      spreadNs: 0,
    });
    assert.deepEqual(source.result.verdict, {
      counters: true,
      loadsRan: true,
      memory: 'passed',
      updateDurationQuantilesWithinTolerance: true,
    });
    assert.deepEqual(
      [epoch.uiThreadCpu.app, epoch.uiThreadCpu.trace],
      [350, 350]
    );
    assert.deepEqual([epoch.jsThreadCpu.app, epoch.jsThreadCpu.trace], [2, 2]);
    assert.deepEqual(
      [epoch.mountBatchCount.app, epoch.mountBatchCount.trace],
      [600, 600]
    );

    const { writeObserverCost } = validationSources(
      path.join(TEST_ROOT.root, 'observer-costs'),
      identityOf(source.result)
    );
    const record = buildValidationRecord({
      knownWorks: [],
      observerCosts: [
        writeObserverCost('idle', 'idle-cost'),
        writeObserverCost('loaded', 'worklet-styles-transform'),
      ].map(readObserverCostResult),
      crosschecks: [source],
    });
    assert.deepEqual(record.sources.crosschecks, [source]);
    const gates = record.metrics.processInstructionRate?.gates ?? [];
    assert.ok(gates.every((gate) => gate.source !== source.folder));
    assert.deepEqual(
      gates
        .filter((gate) => gate.outcome !== 'passed')
        .map((gate) => gate.gate),
      ['a known-work test']
    );
    const file = path.join(TEST_ROOT.root, 'validation.json');
    fs.writeFileSync(file, JSON.stringify(record));
    assert.deepEqual(readValidationRecord(file), record);
  });

  it('stops the wait for the SAMPLE line and the app when the recording fails', async () => {
    const { calls, result } = crosscheck(
      { lines: [launchLine(), readyLine('crosscheck-load')] },
      async ({ onRecording }) => {
        await onRecording();
        throw new ToolError('xctrace stopped (exit 1)');
      }
    );
    await assert.rejects(result, /xctrace stopped \(exit 1\)/);
    assert.deepEqual(calls.slice(-3), [
      'notify com.reanimatedbenchmark.start-epochs',
      'stop console',
      `terminate ${APP}`,
    ]);
  });

  it('is a tool error when the app ends before its SAMPLE line', async () => {
    const { calls, result } = crosscheck(
      {
        lines: [launchLine(), readyLine('crosscheck-load')],
        endsAfterLines: true,
      },
      async ({ onRecording }) => onRecording()
    );
    await assert.rejects(
      result,
      /The app gave no SAMPLE line: the app process 812 ended before its SAMPLE line/
    );
    assert.equal(calls.at(-1), `terminate ${APP}`);
  });
});
