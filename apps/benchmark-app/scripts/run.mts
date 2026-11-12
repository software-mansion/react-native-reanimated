import fs from 'node:fs';
import path from 'node:path';

import {
  AndroidDevice,
  DeviceStateGuard,
  checkAbi,
  checkSdk,
  cleanUpDevice,
} from './android-device.mts';
import type { DeviceState } from './android-device.mts';
import type { RunOptions } from './arguments.mts';
import {
  VARIANT_KEYS,
  validateConfig,
  validateNoiseLimits,
} from './config.mts';
import type { RunConfig, VariantKey } from './config.mts';
import { ToolError } from './errors.mts';
import { evaluateExpectations, exitCodeOf } from './expectations.mts';
import type { VerdictMetric } from './metrics.mts';
import { APP_DIR, BUILDS_DIR, RUNS_DIR } from './paths.mts';
import { TraceProcessor } from './perfetto.mts';
import { SYSTEM_CLOCK, takeSample } from './protocol.mts';
import type { Collector } from './protocol.mts';
import { renderReport } from './report.mts';
import { createRunFolder, writeResult } from './results.mts';
import type { RunResult, RunStatus } from './results.mts';
import type { Scenario } from './scenarios.mts';
import { runScenario } from './session.mts';
import type { SamplePlace, ScenarioOutcome } from './session.mts';
import {
  once,
  readToolVersions,
  resolveAdb,
  resolveAndroidHome,
  resolveTraceProcessor,
} from './tools.mts';
import type { CommandContext, Processes } from './tools.mts';
import { buildVariant } from './variant-build.mts';
import type { BuiltVariant } from './variant-build.mts';
import { computeVerdictRows } from './verdict.mts';
import type { NoiseLimits } from './verdict.mts';

export interface RunDependencies {
  buildVariant: typeof buildVariant;
  createDevice: (
    processes: Processes,
    adb: string,
    serial: string
  ) => AndroidDevice;
  createCollector: (processes: Processes, traceProcessor: string) => Collector;
}

const DEFAULT_DEPENDENCIES: RunDependencies = {
  buildVariant,
  createDevice: (processes, adb, serial) =>
    new AndroidDevice(processes, adb, serial),
  createCollector: (processes, traceProcessor) =>
    new TraceProcessor(processes, traceProcessor),
};

export async function runCommand(
  options: RunOptions,
  context: CommandContext,
  dependencies: RunDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const { processes, log } = context;
  const config = readConfig(options.config);
  const noiseLimits = options.noiseLimits
    ? validateNoiseLimits(readJson(options.noiseLimits))
    : null;
  const androidHome = resolveAndroidHome();
  const adb = resolveAdb({ ...process.env, ANDROID_HOME: androidHome });
  const traceProcessor = resolveTraceProcessor(options.traceProcessor);
  const device = dependencies.createDevice(processes, adb, options.serial);
  await device.checkConnected();
  const startState = await device.readState();
  checkSdk(startState);
  checkAbi(startState);

  const startedAt = new Date();
  const folder = createRunFolder(RUNS_DIR, startedAt, config.name);
  const result: RunResult = {
    formatVersion: 1,
    status: 'running',
    startedAt: startedAt.toISOString(),
    config,
    options: {
      blocks: options.blocks,
      noiseLimitsFile: options.noiseLimits ?? null,
      keepTraces: options.keepTraces,
    },
    noiseLimits,
    serial: options.serial,
    device: startState,
    tools: await readToolVersions(
      processes,
      adb,
      traceProcessor,
      options.serial
    ),
    variants: {},
    scenarios: [],
    statistics: [],
    expectations: [],
  };
  writeResult(folder, result);
  log(`run folder ${folder}`);

  const finish = once(async (status: RunStatus, error?: Error) => {
    await cleanUpDevice(
      device,
      Object.values(result.variants).map((built) => built.applicationId),
      log
    );
    writeResult(folder, {
      ...result,
      status,
      ...(error ? { error: error.message } : {}),
      finishedAt: new Date().toISOString(),
    });
  });
  context.onInterrupt(() => finish('interrupted'));
  const guard = new DeviceStateGuard(startState);

  try {
    const variants = await buildVariants(
      config,
      androidHome,
      context,
      dependencies,
      result
    );
    writeResult(folder, result);
    for (const key of VARIANT_KEYS) {
      log(`install ${variants[key].applicationId}`);
      await device.install(variants[key].apk);
      await device.compileForSpeed(variants[key].applicationId);
    }

    const collector = dependencies.createCollector(processes, traceProcessor);
    for (const scenario of config.scenarios) {
      const sampler = (place: SamplePlace) =>
        takeCheckedSample(place, {
          device,
          collector,
          variants,
          startState,
          guard,
          folder,
          keepTraces: options.keepTraces,
          log,
        });
      result.scenarios.push(
        await runScenario(scenario, options.blocks, sampler)
      );
      writeResult(folder, result);
    }

    result.statistics = computeStatistics(result.scenarios, noiseLimits);
    result.expectations = evaluateExpectations(
      config.expect,
      result.statistics,
      result.scenarios.flatMap((outcome) =>
        outcome.failed ? [outcome.failed] : []
      )
    );
    result.status = 'done';
    result.finishedAt = new Date().toISOString();
    writeResult(folder, result);
    const reportFile = path.join(folder, 'report.md');
    fs.writeFileSync(reportFile, renderReport(result));
    log(`report ${reportFile}`);
    return exitCodeOf(result.expectations);
  } catch (error) {
    await finish('tool error', error as Error).catch((finishError: Error) =>
      log(`cannot write the final result: ${finishError.message}`)
    );
    throw error;
  }
}

function readConfig(file: string): RunConfig {
  return validateConfig(readJson(file), path.dirname(path.resolve(file)), {
    isFile: (candidate) =>
      fs.statSync(candidate, { throwIfNoEntry: false })?.isFile() ?? false,
  });
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ToolError(
      `Cannot read JSON from ${file}: ${(error as Error).message}`
    );
  }
}

async function buildVariants(
  config: RunConfig,
  androidHome: string,
  context: CommandContext,
  dependencies: RunDependencies,
  result: RunResult
): Promise<Record<VariantKey, BuiltVariant>> {
  for (const key of VARIANT_KEYS) {
    result.variants[key] = await dependencies.buildVariant({
      appDir: APP_DIR,
      buildsDir: BUILDS_DIR,
      key,
      variant: config[key],
      androidHome,
      processes: context.processes,
      log: context.log,
    });
  }
  return result.variants as Record<VariantKey, BuiltVariant>;
}

interface SampleContext {
  device: AndroidDevice;
  collector: Collector;
  variants: Record<VariantKey, BuiltVariant>;
  startState: DeviceState;
  guard: DeviceStateGuard;
  folder: string;
  keepTraces: boolean;
  log: (message: string) => void;
}

async function takeCheckedSample(place: SamplePlace, context: SampleContext) {
  const { device, variants, startState, guard } = context;
  const state = await device.readState();
  guard.checkIdle(state);
  const tracesDir = path.join(context.folder, 'traces');
  fs.mkdirSync(tracesDir, { recursive: true });
  const sample = await takeSample(
    {
      applicationId: variants[place.variant].applicationId,
      stopApplicationIds: VARIANT_KEYS.map(
        (key) => variants[key].applicationId
      ),
      scenario: place.scenario,
      baselineTemperature: startState.batteryTemperature,
      guard,
      traceFile: path.join(
        tracesDir,
        `${place.scenario}-block${place.block}-attempt${place.attempt}-${place.position}-${place.variant}.perfetto-trace`
      ),
      keepTrace: context.keepTraces,
    },
    device,
    context.collector,
    SYSTEM_CLOCK
  );
  context.log(
    `${place.scenario} block ${place.block} attempt ${place.attempt} ${place.variant.toUpperCase()}: ${sample.valid ? 'valid' : `invalid (${sample.cause}: ${sample.detail})`}`
  );
  return { ...place, batteryLevel: state.batteryLevel, ...sample };
}

function computeStatistics(
  outcomes: ScenarioOutcome[],
  noiseLimits: NoiseLimits | null
) {
  const completed = outcomes.filter((outcome) => outcome.failed === null);
  const samples = completed.flatMap((outcome) => outcome.samples);
  const valuesOf = (
    scenario: Scenario,
    metric: VerdictMetric,
    variant: VariantKey
  ) =>
    samples.flatMap((sample) => {
      const selected =
        sample.valid &&
        sample.accepted &&
        sample.scenario === scenario &&
        sample.variant === variant;
      const value = selected ? sample.metrics[metric] : null;
      return typeof value === 'number' ? [value] : [];
    });
  return computeVerdictRows(
    completed.map((outcome) => outcome.scenario),
    valuesOf,
    noiseLimits ?? {}
  );
}
