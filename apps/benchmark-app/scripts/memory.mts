import path from 'node:path';

import { STATE_KEYS_WITHOUT_BATTERY_LEVEL } from './android-device.mts';
import type { BatteryInfo } from './android-device.mts';
import type { MemoryOptions, MemoryResumeOptions } from './arguments.mts';
import { VARIANT_KEYS, validateVariantsConfig } from './config.mts';
import type { VariantKey } from './config.mts';
import {
  DEFAULT_DEPENDENCIES,
  readConfig,
  resumeMeasurement,
  startMeasurement,
} from './measurement.mts';
import type {
  MeasurementDependencies,
  MeasurementJob,
} from './measurement.mts';
import { renderMemoryReport } from './memory-report.mts';
import {
  checkedFrameCounter,
  drawingFloor,
  exitCodeOfVerdicts,
  launchCount,
  leakVerdict,
  memoryLaunchOrder,
  parseGfxinfo,
  parseMeminfo,
  readingProblem,
  readingTimes,
  tailLevel,
  tailSlope,
} from './memory-series.mts';
import type {
  CountedFrames,
  LeakVerdict,
  MemoryReading,
  MemorySchedule,
} from './memory-series.mts';
import { measureRunningApp, processEnd, runLaunchedApp } from './protocol.mts';
import type {
  Clock,
  Collector,
  InvalidCause,
  RunningApp,
  SampleDevice,
  SampleRequest,
  SampleResult,
  SampleSteps,
  ValidSample,
} from './protocol.mts';
import { readMeasurementResult } from './results.mts';
import type { MeasurementResult } from './results.mts';
import type { Scenario } from './scenarios.mts';
import { median } from './statistics.mts';
import type { CommandContext } from './tools.mts';

export interface MemoryDevice extends SampleDevice {
  readMeminfo: (applicationId: string) => Promise<string>;
  readGfxinfo: (applicationId: string) => Promise<string>;
  readBattery: () => Promise<BatteryInfo>;
}

type LaunchProblem = Pick<InvalidMemoryLaunch, 'cause' | 'detail'>;

interface MemorySeries {
  readings: MemoryReading[];
  minimumFrameRate: number;
  problem: LaunchProblem | null;
}

interface LaunchObservations {
  readings: MemoryReading[];
  minimumFrameRate?: number;
  work?: SampleResult;
  refreshRate?: number;
  timings: SampleSteps['timings'];
}

export type ValidMemoryLaunch = LaunchObservations & {
  valid: true;
  work: ValidSample;
};

export type InvalidMemoryLaunch = LaunchObservations & {
  valid: false;
  cause: InvalidCause;
  detail: string;
};

export type MemoryLaunch = ValidMemoryLaunch | InvalidMemoryLaunch;

export interface LaunchTail {
  launch: number;
  segment: number;
  tailLevel: number;
  tailSlope: number;
}

export interface VariantMemorySummary {
  variant: VariantKey;
  launches: LaunchTail[];
  tailLevelMedian: number | null;
  tailSlopeMedian: number | null;
  verdict: LeakVerdict;
}

export type MemoryTestOptions = MemorySchedule & {
  scenario: Scenario;
  launches: number;
  slopeLimit: number;
  keepTraces: boolean;
};

export interface MemoryResult extends MeasurementResult<MemoryLaunch> {
  command: 'memory';
  options: MemoryTestOptions;
  summary: VariantMemorySummary[];
}

const MILLISECONDS_PER_SECOND = 1000;

export async function memoryCommand(
  options: MemoryOptions,
  context: CommandContext,
  dependencies: MeasurementDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const config = readConfig(options.config, validateVariantsConfig);
  return startMeasurement(
    {
      config,
      serial: options.serial,
      traceProcessor: options.traceProcessor,
      folderName: `${config.name}-memory-${options.scenario}`,
    },
    (fields) => ({
      ...fields,
      command: 'memory',
      options: {
        scenario: options.scenario,
        launches: options.launches,
        intervalSeconds: options.intervalSeconds,
        durationSeconds: options.durationSeconds,
        slopeLimit: options.slopeLimit,
        keepTraces: options.keepTraces,
      },
      summary: [],
    }),
    memoryJob,
    context,
    dependencies
  );
}

export async function memoryResumeCommand(
  options: MemoryResumeOptions,
  context: CommandContext,
  dependencies: MeasurementDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const folder = path.resolve(options.folder);
  return resumeMeasurement(
    folder,
    readMeasurementResult<MemoryResult>(folder, 'memory'),
    options,
    memoryJob,
    context,
    dependencies
  );
}

function memoryJob(
  result: MemoryResult
): MeasurementJob<MemoryLaunch, MemoryResult> {
  const { options } = result;
  return {
    scenarios: [options.scenario],
    stateKeys: STATE_KEYS_WITHOUT_BATTERY_LEVEL,
    blocksOf: () => launchCount(options.launches),
    orderOf: memoryLaunchOrder,
    measure: (request, device, collector, clock) =>
      takeMemoryLaunch(request, options, device, collector, clock),
    clearSummary: (stopped) => {
      stopped.summary = [];
    },
    summarize: (measured) => {
      measured.summary = summarizeMemory(measured);
    },
    renderReport: renderMemoryReport,
    exitCode: (done) =>
      exitCodeOfVerdicts(done.summary.map((variant) => variant.verdict)),
  };
}

export async function takeMemoryLaunch(
  request: SampleRequest,
  schedule: MemorySchedule,
  device: MemoryDevice,
  collector: Collector,
  clock: Clock
): Promise<MemoryLaunch> {
  const launch = await runLaunchedApp(request, device, clock, (app) =>
    measureMemory(app, schedule, device, collector)
  );
  return 'readings' in launch ? launch : { ...launch, readings: [] };
}

async function measureMemory(
  app: RunningApp,
  schedule: MemorySchedule,
  device: MemoryDevice,
  collector: Collector
): Promise<MemoryLaunch> {
  const { timings } = app.steps;
  const { readings, minimumFrameRate, problem } = await readMemorySeries(
    app,
    schedule,
    device
  );
  if (problem !== null) {
    return { valid: false, ...problem, readings, minimumFrameRate, timings };
  }
  const work = await measureRunningApp(app, collector);
  const observed = {
    readings,
    minimumFrameRate,
    refreshRate: work.refreshRate,
    timings,
  };
  return work.valid
    ? { valid: true, ...observed, work }
    : {
        valid: false,
        cause: work.cause,
        detail: work.detail,
        ...observed,
        work,
      };
}

async function readMemorySeries(
  app: RunningApp,
  schedule: MemorySchedule,
  device: MemoryDevice
): Promise<MemorySeries> {
  const { applicationId, guard } = app.request;
  const { clock } = app;
  const minimumFrameRate = drawingFloor(
    guard.checkInApp(await device.readState(), 'before the readings')
  );
  const startedAt = clock.now();
  const secondsSinceStart = () =>
    (clock.now() - startedAt) / MILLISECONDS_PER_SECOND;
  const readings: MemoryReading[] = [];
  const series = (problem: LaunchProblem | null) => ({
    readings,
    minimumFrameRate,
    problem,
  });
  const baseline = await readFrames(app, device, secondsSinceStart);
  if (typeof baseline === 'string') {
    return series({ cause: 'crash', detail: baseline });
  }
  let previous: CountedFrames = baseline;
  for (const plannedSeconds of readingTimes(schedule)) {
    await clock.sleep(
      Math.max(
        0,
        startedAt + plannedSeconds * MILLISECONDS_PER_SECOND - clock.now()
      )
    );
    const requestedAt = clock.now();
    const meminfo = await device.readMeminfo(applicationId);
    const returnedAt = clock.now();
    const seconds = secondsSinceStart();
    const frames = await readFrames(app, device, secondsSinceStart);
    const battery = await device.readBattery();
    const values = parseMeminfo(meminfo);
    const ended =
      app.watch.checkedFailure() ??
      (await processEnd(device, applicationId, app.pid, 'the memory readings'));
    if (ended !== null) {
      return series({ cause: 'crash', detail: ended });
    }
    if (typeof frames === 'string') {
      return series({ cause: 'crash', detail: frames });
    }
    if (values === null) {
      return series({
        cause: 'crash',
        detail: 'dumpsys meminfo found no process of the app',
      });
    }
    const reading: MemoryReading = {
      plannedSeconds,
      seconds,
      meminfoMs: returnedAt - requestedAt,
      ...frames,
      batteryLevel: battery.level,
      batteryTemperature: battery.temperature,
      ...values,
    };
    readings.push(reading);
    const problem = readingProblem(
      reading,
      previous,
      schedule,
      minimumFrameRate
    );
    if (problem !== null) {
      return series(problem);
    }
    previous = reading;
  }
  return series(null);
}

async function readFrames(
  app: RunningApp,
  device: MemoryDevice,
  secondsSinceStart: () => number
): Promise<CountedFrames | string> {
  const output = await device.readGfxinfo(app.request.applicationId);
  const frameSeconds = secondsSinceStart();
  const counter = checkedFrameCounter(parseGfxinfo(output), app.pid);
  return typeof counter === 'string'
    ? counter
    : {
        frameSeconds,
        frameCount: counter.frameCount,
        statsSinceNs: counter.statsSinceNs,
      };
}

export function summarizeMemory(result: MemoryResult): VariantMemorySummary[] {
  const { options } = result;
  const launches = [
    ...result.scenarios,
    ...(result.incompleteScenario ? [result.incompleteScenario] : []),
  ].flatMap((outcome) =>
    outcome.samples.filter((sample) => sample.valid && sample.accepted)
  );
  return VARIANT_KEYS.map((variant) => {
    const tails = launches
      .filter((launch) => launch.variant === variant)
      .map((launch) => ({
        launch: launch.block,
        segment: launch.segment,
        tailLevel: tailLevel(launch.readings, options.durationSeconds),
        tailSlope: tailSlope(launch.readings, options.durationSeconds),
      }));
    const slopes = tails.map((tail) => tail.tailSlope);
    return {
      variant,
      launches: tails,
      tailLevelMedian: medianOrNull(tails.map((tail) => tail.tailLevel)),
      tailSlopeMedian: medianOrNull(slopes),
      verdict: leakVerdict(
        slopes,
        options.launches,
        options.slopeLimit,
        options.durationSeconds
      ),
    };
  });
}

function medianOrNull(values: number[]): number | null {
  return values.length > 0 ? median(values) : null;
}
