import path from 'node:path';

import type { MemoryOptions, MemoryResumeOptions } from './arguments.mts';
import { VARIANT_KEYS } from './config.mts';
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
  LAUNCHES_PER_BLOCK,
  leakVerdict,
  parseMeminfo,
  readingTimes,
  tailLevel,
  tailSlope,
} from './memory-series.mts';
import type {
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
}

interface LaunchObservations {
  readings: MemoryReading[];
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
  block: number;
  position: number;
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
  const config = readConfig(options.config);
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
    blocksOf: () => options.launches / LAUNCHES_PER_BLOCK,
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
      done.summary.every((variant) => variant.verdict !== 'not decided')
        ? 0
        : 1,
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
  const { readings, ended } = await readMemorySeries(app, schedule, device);
  if (ended !== null) {
    return { valid: false, cause: 'crash', detail: ended, readings, timings };
  }
  const work = await measureRunningApp(app, collector);
  const observed = { readings, refreshRate: work.refreshRate, timings };
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
): Promise<{ readings: MemoryReading[]; ended: string | null }> {
  const { applicationId } = app.request;
  const startedAt = app.clock.now();
  const readings: MemoryReading[] = [];
  for (const seconds of readingTimes(schedule)) {
    await app.clock.sleep(
      Math.max(
        0,
        startedAt + seconds * MILLISECONDS_PER_SECOND - app.clock.now()
      )
    );
    const output = await device.readMeminfo(applicationId);
    const ended =
      app.watch.checkedFailure() ??
      (await processEnd(device, applicationId, app.pid, 'the memory readings'));
    if (ended !== null) {
      return { readings, ended };
    }
    readings.push({ seconds, ...parseMeminfo(output) });
  }
  return { readings, ended: null };
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
        block: launch.block,
        position: launch.position,
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
      verdict: leakVerdict(slopes, options.launches, options.slopeLimit),
    };
  });
}

function medianOrNull(values: number[]): number | null {
  return values.length > 0 ? median(values) : null;
}
