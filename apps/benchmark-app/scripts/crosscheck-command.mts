import fs from 'node:fs';
import path from 'node:path';

import type { CrosscheckOptions } from './arguments.mts';
import { SYSTEM_CLOCK } from './clock.mts';
import type { Clock } from './clock.mts';
import { once } from './command-context.mts';
import type { CommandContext } from './command-context.mts';
import {
  CPU_TOLERANCE,
  UPDATE_DURATION_TOLERANCE,
  compareEpochs,
  crosscheckVerdict,
  mapAppClock,
  traceSpans,
} from './crosscheck.mts';
import type { ComparedValue, CrosscheckEpoch } from './crosscheck.mts';
import { ToolError } from './errors.mts';
import {
  START_NOTIFICATION,
  highestThermalState,
  planSeconds,
  readEpoch,
} from './in-app-sample.mts';
import type { InAppSample, SamplePlan } from './in-app-sample.mts';
import { IosDevice, readIosToolVersions } from './ios-device.mts';
import { InAppStateGuard, startIosApp } from './ios-protocol.mts';
import type { RunningIosApp } from './ios-protocol.mts';
import { MEASUREMENT_REVISION } from './measurement-rules.mts';
import type { Processes } from './processes.mts';
import { createMeasurementFolder } from './results.mts';
import { timedSteps } from './samples.mts';
import { readBoundarySignposts, readTraceEpochs } from './xctrace-metrics.mts';
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

const RESULT_FILE = 'crosscheck.json';

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
  const readings = sample.epochs.map((_, index) =>
    readEpoch(sample, index, app.launch.refreshRate)
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
  const epochs = compareEpochs(sample.epochs, readings, traced);
  const verdict = crosscheckVerdict(epochs);
  const result = {
    measurementRevision: MEASUREMENT_REVISION,
    applicationId: options.applicationId,
    scenario: options.scenario,
    load: app.report.load,
    device: state,
    tools,
    plan,
    tolerances: {
      cpu: CPU_TOLERANCE,
      updateDuration: UPDATE_DURATION_TOLERANCE,
    },
    thermalState: highestThermalState(sample),
    clock,
    epochs,
    verdict,
    trace: traceFile,
  };
  fs.writeFileSync(
    path.join(folder, RESULT_FILE),
    `${JSON.stringify(result, null, 2)}\n`
  );
  fs.writeFileSync(path.join(folder, REPORT_FILE), crosscheckReport(epochs));
  log(
    `counters within the gates: ${verdict.counters ? 'yes' : 'no'}; UI update durations equal to the trace frames: ${verdict.updateDurationsEqualTraceFrames ? 'yes' : 'no'}`
  );
  log(`report ${path.join(folder, REPORT_FILE)}`);
  return verdict.counters ? 0 : 1;
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
  try {
    const [receipt] = await Promise.all([
      app.waitForSample(),
      tracer.record({
        udid: options.device.id,
        pid: app.pid,
        traceFile,
        seconds: planSeconds(plan) + RECORDING_MARGIN_SECONDS,
        onRecording: () => device.postNotification(START_NOTIFICATION),
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

function crosscheckReport(epochs: readonly CrosscheckEpoch[]): string {
  const header =
    '| Epoch | Load | Collector | Metric | App | Trace | Signed error | Absolute error | Relative error | Tolerance | Within |';
  const rows = epochs.flatMap((epoch) => {
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
            `| ${[
              String(epoch.index),
              epoch.load,
              epoch.collector,
              metric,
              numberText(value.app),
              numberText(value.trace),
              numberText(value.signedError),
              numberText(value.absoluteError),
              value.relativeError === null
                ? '-'
                : `${(value.relativeError * 100).toFixed(2)}%`,
              numberText(value.tolerance),
              value.passes ? 'yes' : 'no',
            ].join(' | ')} |`,
          ]
    );
  });
  const counts = epochs.map(
    (epoch) =>
      `- Epoch ${epoch.index}: ${epoch.updateCount.app ?? '-'} UI updates in the app, ${epoch.updateCount.trace} \`hitches-updates\` rows in the trace, ${epoch.windowSeconds.toFixed(3)} s.`
  );
  return `${[
    '# Cross-check of the in-app counters with Instruments',
    '',
    header,
    `|${' --- |'.repeat(11)}`,
    ...rows,
    '',
    ...counts,
  ].join('\n')}\n`;
}

function numberText(value: number | null): string {
  return value === null ? '-' : String(Number(value.toFixed(3)));
}
