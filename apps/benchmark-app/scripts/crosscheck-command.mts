import fs from 'node:fs';
import path from 'node:path';

import type { CrosscheckOptions } from './arguments.mts';
import { SYSTEM_CLOCK } from './clock.mts';
import type { Clock } from './clock.mts';
import { once } from './command-context.mts';
import type { CommandContext } from './command-context.mts';
import {
  CROSSCHECK_TOLERANCES,
  compareEpochs,
  compareFootprints,
  crosscheckVerdict,
  mapAppClock,
  traceSpans,
} from './crosscheck.mts';
import type {
  ClockMapping,
  ComparedValue,
  CrosscheckEpoch,
  CrosscheckVerdict,
  FootprintComparison,
} from './crosscheck.mts';
import { ToolError } from './errors.mts';
import {
  START_NOTIFICATION,
  highestThermalState,
  planSeconds,
  readEpoch,
} from './in-app-sample.mts';
import type { InAppSample, SamplePlan } from './in-app-sample.mts';
import { IosDevice, readIosToolVersions } from './ios-device.mts';
import { iosPlatform } from './ios-platform.mts';
import { InAppStateGuard, startIosApp } from './ios-protocol.mts';
import type { RunningIosApp } from './ios-protocol.mts';
import { MEASUREMENT_REVISION } from './measurement-rules.mts';
import type { Processes } from './processes.mts';
import { createMeasurementFolder } from './results.mts';
import { timedSteps } from './samples.mts';
import {
  VALIDATION_SOURCE_FORMAT_VERSION,
  writeCrosscheckResult,
} from './validation-sources.mts';
import type { CrosscheckResult } from './validation-sources.mts';
import {
  readBoundarySignposts,
  readFootprints,
  readTraceEpochs,
} from './xctrace-metrics.mts';
import { Xctrace } from './xctrace.mts';
import type { IosTracer } from './xctrace.mts';

export interface CrosscheckDependencies {
  createDevice: (processes: Processes, udid: string) => IosDevice;
  createTracer: (processes: Processes) => IosTracer;
  clock: Clock;
}

interface RecordedSample {
  app: RunningIosApp;
  sample: InAppSample;
}

const DEFAULT_DEPENDENCIES: CrosscheckDependencies = {
  createDevice: (processes, udid) => new IosDevice(processes, udid),
  createTracer: (processes) => new Xctrace(processes),
  clock: SYSTEM_CLOCK,
};

const RECORDING_MARGIN_SECONDS = 3;

const REPORT_FILE = 'crosscheck.md';

const TRACE_FILE = 'recording.trace';

export async function crosscheckCommand(
  options: CrosscheckOptions,
  context: CommandContext,
  dependencies: CrosscheckDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const { processes, log } = context;
  const device = dependencies.createDevice(processes, options.device.id);
  const tracer = dependencies.createTracer(processes);
  const state = await device.readState();
  await device.checkInstalled(options.applicationId);
  const tools = await readIosToolVersions(processes);
  context.onInterrupt(once(() => device.terminate(options.applicationId)));

  const folder = createMeasurementFolder(
    options.outputDir,
    new Date(),
    `crosscheck-${options.scenario}`
  );
  const traceFile = path.join(folder, TRACE_FILE);
  const plan: SamplePlan = { epochs: options.epochs, start: 'notification' };
  log(`crosscheck ${options.applicationId} ${options.scenario} in ${folder}`);
  const { app, sample } = await recordSample(
    options,
    plan,
    traceFile,
    device,
    tracer,
    dependencies.clock
  );

  const exports = await tracer.collect(traceFile);
  const { refreshRate } = app.launch;
  const readings = sample.epochs.map((_, index) =>
    readEpoch(sample, index, refreshRate)
  );
  const clock = mapAppClock(sample, readBoundarySignposts(exports, app.pid));
  const traced = readTraceEpochs(
    exports,
    {
      pid: app.pid,
      mainThread: app.launch.mainThread,
      jsThread: app.report.jsThread,
    },
    traceSpans(readings, clock)
  );
  const epochs = compareEpochs(
    sample.epochs,
    readings,
    traced,
    clock,
    refreshRate
  );
  const footprints = compareFootprints(
    sample,
    readFootprints(exports, app.pid),
    clock
  );
  const verdict = crosscheckVerdict(epochs, footprints);
  const result: CrosscheckResult = {
    formatVersion: VALIDATION_SOURCE_FORMAT_VERSION,
    measurementRevision: MEASUREMENT_REVISION,
    platform: 'ios',
    device: iosPlatform().deviceIdentity(state),
    appBuild: app.launch.appBuild,
    applicationId: options.applicationId,
    scenario: options.scenario,
    report: { version: app.report.version, load: app.report.load },
    tools,
    plan,
    refreshRate,
    tolerances: CROSSCHECK_TOLERANCES,
    thermalState: highestThermalState(sample),
    clock,
    epochs,
    footprints,
    verdict,
    trace: traceFile,
  };
  writeCrosscheckResult(folder, result);
  fs.writeFileSync(
    path.join(folder, REPORT_FILE),
    crosscheckReport(epochs, footprints, verdict, clock)
  );
  log(
    `counters within the gates: ${yesNo(verdict.counters)}; the loads ran: ${yesNo(verdict.loadsRan)}; memory: ${verdict.memory}; UI update quantiles within tolerance of the trace frames: ${yesNo(verdict.updateDurationQuantilesWithinTolerance)}`
  );
  log(`report ${path.join(folder, REPORT_FILE)}`);
  return verdict.counters && verdict.loadsRan ? 0 : 1;
}

async function recordSample(
  options: CrosscheckOptions,
  plan: SamplePlan,
  traceFile: string,
  device: IosDevice,
  tracer: IosTracer,
  clock: Clock
): Promise<RecordedSample> {
  const start = await startIosApp(
    {
      applicationId: options.applicationId,
      stopApplicationIds: [options.applicationId],
      scenario: options.scenario,
      load: options.load,
      plan,
    },
    { device, clock, guard: new InAppStateGuard(null) },
    timedSteps(clock)
  );
  if (!start.started) {
    throw new ToolError(`The app did not reach READY: ${start.detail}`);
  }
  const { app } = start;
  const stop = new AbortController();
  try {
    const [receipt] = await Promise.all([
      app.waitForSample(stop.signal),
      tracer
        .record({
          udid: options.device.id,
          pid: app.pid,
          traceFile,
          seconds: planSeconds(plan) + RECORDING_MARGIN_SECONDS,
          onRecording: () => device.postNotification(START_NOTIFICATION),
        })
        .catch((error: unknown) => {
          stop.abort();
          throw error;
        }),
    ]);
    if (!receipt.received) {
      throw new ToolError(`The app gave no SAMPLE line: ${receipt.detail}`);
    }
    return { app, sample: receipt.sample };
  } finally {
    await app.close();
  }
}

function crosscheckReport(
  epochs: readonly CrosscheckEpoch[],
  footprints: readonly FootprintComparison[],
  verdict: CrosscheckVerdict,
  clock: ClockMapping
): string {
  const epochRows = epochs.flatMap((epoch) => {
    const values: [string, ComparedValue | null][] = [
      ['uiThreadCpu (ms/s)', epoch.uiThreadCpu],
      ['jsThreadCpu (ms/s)', epoch.jsThreadCpu],
      ['processCpu (ms/s)', epoch.processCpu],
      ['mountBatchCount', epoch.mountBatchCount],
      ['uiUpdateDurationMedian (ms)', epoch.uiUpdateDurationMedian],
      ['uiUpdateDurationP95 (ms)', epoch.uiUpdateDurationP95],
    ];
    return values.flatMap(([metric, value]) =>
      value === null
        ? []
        : [
            tableRow([
              String(epoch.index),
              epoch.load,
              epoch.collector,
              metric,
              ...comparedCells(value),
            ]),
          ]
    );
  });
  const footprintRows = footprints.map((value) =>
    tableRow([
      String(value.boundary),
      String(value.app),
      String(value.rows.length),
      value.low === null || value.high === null
        ? '-'
        : `${numberText(value.low)} to ${numberText(value.high)}`,
      numberText(value.signedError),
      numberText(value.tolerance),
      value.comparable
        ? yesNo(value.passes)
        : `not comparable: ${value.reason}`,
    ])
  );
  const epochLines = epochs.map(
    (epoch) =>
      `- Epoch ${epoch.index} (${epoch.load}, ${epoch.windowSeconds.toFixed(3)} s): ${epoch.updateCount.app ?? '-'} UI updates in the app, ${epoch.updateCount.trace} \`hitches-updates\` rows in the trace. Work units of the load: ${epoch.workProof.own} (at least ${epoch.workProof.minimumOwn.toFixed(1)}), of other loads: ${epoch.workProof.other} (at most ${epoch.workProof.maximumOther.toFixed(1)}): ${epoch.workProof.passes ? 'the load ran' : 'not proved'}.`
  );
  return `${[
    '# Cross-check of the in-app counters with Instruments',
    '',
    `Clock of the app to the clock of the trace: offset ${clock.offsetNs} ns, uncertainty ${clock.uncertaintyNs} ns, spread ${clock.spreadNs} ns. The tolerance of a CPU value includes its timing uncertainty.`,
    '',
    '| Epoch | Load | Collector | Metric | App | Trace | Signed error | Absolute error | Relative error | Timing uncertainty | Tolerance | Within |',
    `|${' --- |'.repeat(12)}`,
    ...epochRows,
    '',
    ...epochLines,
    '',
    'Memory footprint (kB) at each boundary: the app (`phys_footprint`) and the Activity Monitor rows (`memory-physical-footprint`) from the last row that ends before the read to the first row that starts after it, with the clock uncertainty. A boundary is comparable only when these rows cover at most 2 s and differ by less than the tolerance. The error is the distance of the app value from the range of the rows. This is a second reader of the same counter and unit, not a proof of the kernel accounting.',
    '',
    'Assumption, not verified: Activity Monitor took the value of a row at a time between the start and the end of the row. The export of a phone recording must show what the time of a row means before memory can be validated. Until then, memory stays unvalidated.',
    '',
    '| Boundary | App | Rows | Activity Monitor | Signed error | Tolerance | Within |',
    `|${' --- |'.repeat(7)}`,
    ...footprintRows,
    '',
    `- Counters within the gates: ${yesNo(verdict.counters)}.`,
    `- The planned loads ran: ${yesNo(verdict.loadsRan)}.`,
    `- Memory: ${verdict.memory}.`,
    `- UI update quantiles within tolerance of the \`hitches-updates\` quantiles: ${yesNo(verdict.updateDurationQuantilesWithinTolerance)}. The two are different quantities: this result says only that their median and 95th percentile are within the tolerance.`,
  ].join('\n')}\n`;
}

function comparedCells(value: ComparedValue): string[] {
  return [
    numberText(value.app),
    numberText(value.trace),
    numberText(value.signedError),
    numberText(value.absoluteError),
    value.relativeError === null
      ? '-'
      : `${(value.relativeError * 100).toFixed(2)}%`,
    numberText(value.timingUncertainty),
    numberText(value.tolerance),
    yesNo(value.passes),
  ];
}

function tableRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

function numberText(value: number | null): string {
  return value === null ? '-' : String(Number(value.toFixed(3)));
}
