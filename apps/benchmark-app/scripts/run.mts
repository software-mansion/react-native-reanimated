import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AndroidDevice,
  DeviceStateGuard,
  IDLE_STATE_KEYS,
  changedStateKeys,
  checkAbi,
  checkSdk,
  cleanUpDevice,
} from './android-device.mts';
import type { DeviceState } from './android-device.mts';
import type { ResumeOptions, RunOptions } from './arguments.mts';
import {
  VARIANT_KEYS,
  blocksOf,
  validateConfig,
  validateNoiseLimits,
} from './config.mts';
import type { RunConfig, VariantKey } from './config.mts';
import { ToolError } from './errors.mts';
import { evaluateExpectations, exitCodeOf } from './expectations.mts';
import { APP_DIR, BUILDS_DIR, RUNS_DIR } from './paths.mts';
import { TraceProcessor } from './perfetto.mts';
import { SYSTEM_CLOCK, takeSample } from './protocol.mts';
import type { Clock, Collector } from './protocol.mts';
import { renderReport } from './report.mts';
import {
  acceptedValues,
  createRunFolder,
  readResult,
  scenariosWithoutData,
  writeResult,
} from './results.mts';
import type { RunResult, RunStatus, RunVariant } from './results.mts';
import { runScenario } from './session.mts';
import type { SamplePlace } from './session.mts';
import {
  once,
  readToolVersions,
  resolveAdb,
  resolveAndroidHome,
  resolveTraceProcessor,
} from './tools.mts';
import type { CommandContext, Processes, ToolVersions } from './tools.mts';
import { buildVariant } from './variant-build.mts';
import { computeVerdictRows } from './verdict.mts';

export interface RunDependencies {
  buildVariant: typeof buildVariant;
  createDevice: (
    processes: Processes,
    adb: string,
    serial: string
  ) => AndroidDevice;
  createCollector: (processes: Processes, traceProcessor: string) => Collector;
  clock: Clock;
  runsDir: string;
}

interface Tools {
  androidHome: string;
  adb: string;
  traceProcessor: string;
}

interface Session {
  result: RunResult;
  folder: string;
  device: AndroidDevice;
  traceProcessor: string;
}

type Variants = Record<VariantKey, RunVariant>;

const DEFAULT_DEPENDENCIES: RunDependencies = {
  buildVariant,
  createDevice: (processes, adb, serial) =>
    new AndroidDevice(processes, adb, serial),
  createCollector: (processes, traceProcessor) =>
    new TraceProcessor(processes, traceProcessor),
  clock: SYSTEM_CLOCK,
  runsDir: RUNS_DIR,
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
  const tools = resolveTools(options.traceProcessor);
  const device = dependencies.createDevice(
    processes,
    tools.adb,
    options.serial
  );
  const startState = await readCheckedState(device);

  const startedAt = new Date().toISOString();
  const folder = createRunFolder(
    dependencies.runsDir,
    new Date(startedAt),
    config.name
  );
  const result: RunResult = {
    formatVersion: 1,
    status: 'running',
    startedAt,
    config,
    options: {
      blocks: options.blocks,
      noiseLimitsFile: options.noiseLimits ?? null,
      keepTraces: options.keepTraces,
    },
    noiseLimits,
    serial: options.serial,
    segments: [{ startedAt, status: 'running', device: startState }],
    appRefreshRate: null,
    tools: await readToolVersions(
      processes,
      tools.adb,
      tools.traceProcessor,
      options.serial
    ),
    variants: {},
    scenarios: [],
    incompleteScenario: null,
    abandonedScenarios: [],
    statistics: [],
    expectations: [],
  };
  writeResult(folder, result);
  log(`run folder ${folder}`);

  return measure(
    { result, folder, device, traceProcessor: tools.traceProcessor },
    () =>
      buildVariants(config, tools.androidHome, context, dependencies, result),
    context,
    dependencies
  );
}

export async function resumeCommand(
  options: ResumeOptions,
  context: CommandContext,
  dependencies: RunDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const { processes, log } = context;
  const folder = path.resolve(options.folder);
  const result = readResult(folder);
  const variants = checkResumable(result, options.serial);
  const tools = resolveTools(options.traceProcessor);
  const device = dependencies.createDevice(
    processes,
    tools.adb,
    options.serial
  );
  const startState = await readCheckedState(device);
  checkSameTools(
    result.tools,
    await readToolVersions(
      processes,
      tools.adb,
      tools.traceProcessor,
      options.serial
    )
  );
  checkSameDeviceState(result.segments[0].device, startState);

  startSegment(result, startState);
  writeResult(folder, result);
  log(
    `resume run folder ${folder}, segment ${result.segments.length - 1}, scenarios to measure: ${scenariosWithoutData(result).join(', ')}`
  );

  return measure(
    { result, folder, device, traceProcessor: tools.traceProcessor },
    async () => variants,
    context,
    dependencies
  );
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

function resolveTools(traceProcessorOption: string | undefined): Tools {
  const androidHome = resolveAndroidHome();
  return {
    androidHome,
    adb: resolveAdb({ ...process.env, ANDROID_HOME: androidHome }),
    traceProcessor: resolveTraceProcessor(traceProcessorOption),
  };
}

async function readCheckedState(device: AndroidDevice): Promise<DeviceState> {
  await device.checkConnected();
  const state = await device.readState();
  checkSdk(state);
  checkAbi(state);
  return state;
}

async function measure(
  session: Session,
  prepareVariants: () => Promise<Variants>,
  context: CommandContext,
  dependencies: RunDependencies
): Promise<number> {
  const { result, folder, device } = session;
  const { log } = context;
  const stop = once(async (status: RunStatus, error?: Error) => {
    await cleanUpDevice(
      device,
      Object.values(result.variants).map((built) => built.applicationId),
      log
    );
    endSegment(result, status, error);
    writeResult(folder, result);
    summarize(result);
    writeResult(folder, result);
    writeReport(folder, result, log);
  });
  context.onInterrupt(() => stop('interrupted'));

  try {
    const variants = await prepareVariants();
    writeResult(folder, result);
    await installVariants(device, variants, log);
    const sampleContext: SampleContext = {
      session,
      collector: dependencies.createCollector(
        context.processes,
        session.traceProcessor
      ),
      variants,
      guard: new DeviceStateGuard(
        result.segments[0].device,
        result.appRefreshRate
      ),
      clock: dependencies.clock,
      log,
    };
    for (const scenario of scenariosWithoutData(result)) {
      const outcome = await runScenario(
        scenario,
        blocksOf(result.config, scenario, result.options.blocks),
        (place) => takeCheckedSample(place, sampleContext),
        (progress) => {
          result.incompleteScenario = progress;
          writeResult(folder, result);
        }
      );
      result.incompleteScenario = null;
      result.scenarios.push(outcome);
      writeResult(folder, result);
    }

    summarize(result);
    endSegment(result, 'done');
    writeResult(folder, result);
    writeReport(folder, result, log);
    return exitCodeOf(result.expectations);
  } catch (error) {
    await stop('tool error', error as Error).catch((stopError: Error) =>
      log(`cannot write the final result: ${stopError.message}`)
    );
    throw error;
  }
}

function endSegment(result: RunResult, status: RunStatus, error?: Error) {
  const finishedAt = new Date().toISOString();
  const segment = result.segments[result.segments.length - 1];
  segment.status = status;
  segment.finishedAt = finishedAt;
  result.status = status;
  result.finishedAt = finishedAt;
  if (error) {
    segment.error = error.message;
    result.error = error.message;
  }
}

function summarize(result: RunResult) {
  const completed = result.scenarios.filter(
    (outcome) => outcome.failed === null
  );
  const withoutData = scenariosWithoutData(result);
  result.statistics = computeVerdictRows(
    completed.map((outcome) => outcome.scenario),
    (scenario, metric, variant) =>
      completed
        .filter((outcome) => outcome.scenario === scenario)
        .flatMap((outcome) => acceptedValues(outcome, metric, variant)),
    result.noiseLimits ?? {},
    result.config.scenarios.filter(
      (scenario) => !completed.some((outcome) => outcome.scenario === scenario)
    )
  );
  result.expectations = evaluateExpectations(
    result.config.expect,
    result.statistics,
    result.scenarios.flatMap((outcome) =>
      outcome.failed ? [outcome.failed] : []
    ),
    withoutData
  );
}

function writeReport(
  folder: string,
  result: RunResult,
  log: (message: string) => void
) {
  const reportFile = path.join(folder, 'report.md');
  fs.writeFileSync(reportFile, renderReport(result));
  log(`report ${reportFile}`);
}

async function installVariants(
  device: AndroidDevice,
  variants: Variants,
  log: (message: string) => void
) {
  for (const key of VARIANT_KEYS) {
    log(`install ${variants[key].applicationId}`);
    await device.install(variants[key].apk);
    await device.compileForSpeed(variants[key].applicationId);
  }
}

interface SampleContext {
  session: Session;
  collector: Collector;
  variants: Variants;
  guard: DeviceStateGuard;
  clock: Clock;
  log: (message: string) => void;
}

async function takeCheckedSample(place: SamplePlace, context: SampleContext) {
  const { session, variants, guard } = context;
  const { result, device } = session;
  const state = await device.readState();
  guard.checkIdle(state);
  const tracesDir = path.join(session.folder, 'traces');
  fs.mkdirSync(tracesDir, { recursive: true });
  const segment = result.segments.length - 1;
  const sample = await takeSample(
    {
      applicationId: variants[place.variant].applicationId,
      stopApplicationIds: VARIANT_KEYS.map(
        (key) => variants[key].applicationId
      ),
      scenario: place.scenario,
      baselineTemperature: result.segments[0].device.batteryTemperature,
      guard,
      traceFile: path.join(
        tracesDir,
        `${place.scenario}-segment${segment}-block${place.block}-attempt${place.attempt}-${place.position}-${place.variant}.perfetto-trace`
      ),
      keepTrace: result.options.keepTraces,
    },
    device,
    context.collector,
    context.clock
  );
  result.appRefreshRate ??= sample.refreshRate ?? null;
  context.log(
    `${place.scenario} block ${place.block} attempt ${place.attempt} ${place.variant.toUpperCase()}: ${sample.valid ? 'valid' : `invalid (${sample.cause}: ${sample.detail})`}`
  );
  return { ...place, batteryLevel: state.batteryLevel, ...sample };
}

async function buildVariants(
  config: RunConfig,
  androidHome: string,
  context: CommandContext,
  dependencies: RunDependencies,
  result: RunResult
): Promise<Variants> {
  for (const key of VARIANT_KEYS) {
    const built = await dependencies.buildVariant({
      appDir: APP_DIR,
      buildsDir: BUILDS_DIR,
      key,
      variant: config[key],
      androidHome,
      processes: context.processes,
      log: context.log,
    });
    result.variants[key] = { ...built, apkSha256: sha256File(built.apk) };
  }
  return result.variants as Variants;
}

function sha256File(file: string): string {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function checkResumable(result: RunResult, serial: string): Variants {
  if (result.status === 'done') {
    throw new ToolError(
      'The run is done. Only a run that is not done can resume.'
    );
  }
  if (result.serial !== serial) {
    throw new ToolError(
      `The run used the device ${result.serial}, not ${serial}. A run resumes only on its device.`
    );
  }
  for (const key of VARIANT_KEYS) {
    checkStoredApk(key, result.variants[key]);
  }
  return result.variants as Variants;
}

function checkStoredApk(key: VariantKey, variant: RunVariant | undefined) {
  if (typeof variant?.apkSha256 !== 'string') {
    throw new ToolError(
      `The run folder has no APK hash of variant ${key}. This run cannot resume. Start a new run.`
    );
  }
  if (!fs.existsSync(variant.apk)) {
    throw new ToolError(
      `The build of variant ${key} does not exist any more: ${variant.apk}`
    );
  }
  if (sha256File(variant.apk) !== variant.apkSha256) {
    throw new ToolError(
      `The APK of variant ${key} changed after the run started: ${variant.apk}`
    );
  }
}

function checkSameTools(
  stored: ToolVersions | undefined,
  current: ToolVersions
) {
  if (stored === undefined) {
    throw new ToolError(
      'The run folder has no tool versions. This run cannot resume.'
    );
  }
  const changes = (Object.keys(current) as (keyof ToolVersions)[])
    .filter((key) => stored[key] !== current[key])
    .map((key) => `${key}: ${stored[key]} -> ${current[key]}`);
  if (changes.length > 0) {
    throw new ToolError(
      `The tool versions changed after the run started: ${changes.join(', ')}`
    );
  }
}

function checkSameDeviceState(stored: DeviceState, current: DeviceState) {
  const changes = changedStateKeys(stored, current, IDLE_STATE_KEYS);
  if (changes.length > 0) {
    throw new ToolError(
      `The device state is not the same as at the start of the run: ${changes.join(', ')}`
    );
  }
}

function startSegment(result: RunResult, device: DeviceState) {
  const previousSegment = result.segments.length - 1;
  if (result.segments[previousSegment].status === 'running') {
    result.segments[previousSegment].status = 'interrupted';
  }
  if (result.incompleteScenario) {
    result.abandonedScenarios.push({
      ...result.incompleteScenario,
      segment: previousSegment,
    });
    result.incompleteScenario = null;
  }
  result.status = 'running';
  result.error = undefined;
  result.finishedAt = undefined;
  result.statistics = [];
  result.expectations = [];
  result.segments.push({
    startedAt: new Date().toISOString(),
    status: 'running',
    device,
  });
}
