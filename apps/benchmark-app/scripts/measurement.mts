import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AndroidDevice,
  DeviceStateGuard,
  idleKeysOf,
  changedStateKeys,
  checkAbi,
  checkSdk,
  cleanUpDevice,
} from './android-device.mts';
import type { DeviceState } from './android-device.mts';
import { VARIANT_KEYS } from './config.mts';
import type { FileSystem, VariantKey, VariantsConfig } from './config.mts';
import { ToolError } from './errors.mts';
import { APP_DIR, BUILDS_DIR, RUNS_DIR } from './paths.mts';
import { TraceProcessor } from './perfetto.mts';
import { SYSTEM_CLOCK } from './protocol.mts';
import type { Clock, Collector, SampleRequest } from './protocol.mts';
import {
  FORMAT_VERSION,
  createRunFolder,
  scenariosWithoutData,
  writeResult,
} from './results.mts';
import type { MeasurementResult, RunStatus, RunVariant } from './results.mts';
import type { Scenario } from './scenarios.mts';
import { runScenario } from './session.mts';
import type {
  BlockOrder,
  Judged,
  Measured,
  Recorded,
  SamplePlace,
} from './session.mts';
import {
  once,
  readToolVersions,
  resolveAdb,
  resolveAndroidHome,
  resolveTraceProcessor,
} from './tools.mts';
import type { CommandContext, Processes, ToolVersions } from './tools.mts';
import { buildVariant } from './variant-build.mts';

export interface MeasurementDependencies {
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

export type JobResult = Judged & { refreshRate?: number };

export interface MeasurementJob<
  S extends JobResult,
  R extends MeasurementResult<S>,
> {
  scenarios: readonly Scenario[];
  stateKeys: readonly (keyof DeviceState)[];
  blocksOf: (scenario: Scenario) => number;
  orderOf: BlockOrder;
  measure: (
    request: SampleRequest,
    device: AndroidDevice,
    collector: Collector,
    clock: Clock
  ) => Promise<S>;
  clearSummary: (result: R) => void;
  summarize: (result: R) => void;
  renderReport: (result: R) => string;
  exitCode: (result: R) => number;
}

export type NewResultFields<S extends JobResult> = Omit<
  MeasurementResult<S>,
  'command' | 'options'
>;

export interface Start {
  config: VariantsConfig;
  serial: string;
  traceProcessor?: string;
  folderName: string;
}

export interface Resume {
  serial: string;
  traceProcessor?: string;
}

interface Tools {
  androidHome: string;
  adb: string;
  traceProcessor: string;
}

interface Session<R> {
  result: R;
  folder: string;
  device: AndroidDevice;
  traceProcessor: string;
}

type Variants = Record<VariantKey, RunVariant>;

export const DEFAULT_DEPENDENCIES: MeasurementDependencies = {
  buildVariant,
  createDevice: (processes, adb, serial) =>
    new AndroidDevice(processes, adb, serial),
  createCollector: (processes, traceProcessor) =>
    new TraceProcessor(processes, traceProcessor),
  clock: SYSTEM_CLOCK,
  runsDir: RUNS_DIR,
};

export function readConfig<C>(
  file: string,
  validate: (raw: unknown, configDir: string, fileSystem: FileSystem) => C
): C {
  return validate(readJson(file), path.dirname(path.resolve(file)), {
    isFile: (candidate) =>
      fs.statSync(candidate, { throwIfNoEntry: false })?.isFile() ?? false,
  });
}

export function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ToolError(
      `Cannot read JSON from ${file}: ${(error as Error).message}`
    );
  }
}

export async function startMeasurement<
  S extends JobResult,
  R extends MeasurementResult<S>,
>(
  start: Start,
  createResult: (fields: NewResultFields<S>) => R,
  createJob: (result: R) => MeasurementJob<S, R>,
  context: CommandContext,
  dependencies: MeasurementDependencies
): Promise<number> {
  const { processes, log } = context;
  const tools = resolveTools(start.traceProcessor);
  const device = dependencies.createDevice(processes, tools.adb, start.serial);
  const startState = await readCheckedState(device);

  const startedAt = new Date().toISOString();
  const folder = createRunFolder(
    dependencies.runsDir,
    new Date(startedAt),
    start.folderName
  );
  const result = createResult({
    formatVersion: FORMAT_VERSION,
    status: 'running',
    startedAt,
    config: start.config,
    serial: start.serial,
    segments: [{ startedAt, status: 'running', device: startState }],
    appRefreshRate: null,
    tools: await readToolVersions(
      processes,
      tools.adb,
      tools.traceProcessor,
      start.serial
    ),
    variants: {},
    scenarios: [],
    incompleteScenario: null,
    abandonedScenarios: [],
  });
  writeResult(folder, result);
  log(`run folder ${folder}`);

  return measure(
    { result, folder, device, traceProcessor: tools.traceProcessor },
    createJob(result),
    () =>
      buildVariants(
        start.config,
        tools.androidHome,
        context,
        dependencies,
        result
      ),
    context,
    dependencies
  );
}

export async function resumeMeasurement<
  S extends JobResult,
  R extends MeasurementResult<S>,
>(
  folder: string,
  result: R,
  resume: Resume,
  createJob: (result: R) => MeasurementJob<S, R>,
  context: CommandContext,
  dependencies: MeasurementDependencies
): Promise<number> {
  const { processes, log } = context;
  const variants = checkResumable(result);
  const tools = resolveTools(resume.traceProcessor);
  const device = dependencies.createDevice(processes, tools.adb, resume.serial);
  const startState = await readCheckedState(device);
  checkSameTools(
    result.tools,
    await readToolVersions(
      processes,
      tools.adb,
      tools.traceProcessor,
      resume.serial
    )
  );
  const job = createJob(result);
  checkSameDeviceState(result.segments[0].device, startState, job.stateKeys);

  result.serial = resume.serial;
  startSegment(result, startState);
  job.clearSummary(result);
  writeResult(folder, result);
  log(
    `resume run folder ${folder}, segment ${result.segments.length - 1}, scenarios to measure: ${scenariosWithoutData(result, job.scenarios).join(', ')}`
  );

  return measure(
    { result, folder, device, traceProcessor: tools.traceProcessor },
    job,
    async () => variants,
    context,
    dependencies
  );
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

async function measure<S extends JobResult, R extends MeasurementResult<S>>(
  session: Session<R>,
  job: MeasurementJob<S, R>,
  prepareVariants: () => Promise<Variants>,
  context: CommandContext,
  dependencies: MeasurementDependencies
): Promise<number> {
  const { result, folder, device } = session;
  const { log } = context;
  const finish = (status: RunStatus, error?: Error) => {
    endSegment(result, status, error);
    writeResult(folder, result);
    job.summarize(result);
    writeResult(folder, result);
    writeReport(folder, job.renderReport(result), log);
  };
  const stop = once(async (status: RunStatus, error?: Error) => {
    await cleanUpDevice(
      device,
      Object.values(result.variants).map((built) => built.applicationId),
      log
    );
    finish(status, error);
  });
  context.onInterrupt(() => stop('interrupted'));

  try {
    const variants = await prepareVariants();
    writeResult(folder, result);
    await installVariants(device, variants, log);
    const sampleContext: SampleContext<R> = {
      session,
      collector: dependencies.createCollector(
        context.processes,
        session.traceProcessor
      ),
      variants,
      guard: new DeviceStateGuard(
        result.segments[0].device,
        result.appRefreshRate,
        job.stateKeys
      ),
      clock: dependencies.clock,
      log,
    };
    for (const scenario of scenariosWithoutData(result, job.scenarios)) {
      const outcome = await runScenario(
        scenario,
        job.blocksOf(scenario),
        (place) => takeCheckedSample(place, sampleContext, job),
        (progress) => {
          result.incompleteScenario = progress;
          writeResult(folder, result);
        },
        keptSamples(result, scenario),
        job.orderOf
      );
      result.incompleteScenario = null;
      result.scenarios.push(outcome);
      writeResult(folder, result);
    }

    finish('done');
    return job.exitCode(result);
  } catch (error) {
    await stop('tool error', error as Error).catch((stopError: Error) =>
      log(`cannot write the final result: ${stopError.message}`)
    );
    throw error;
  }
}

function endSegment(
  result: MeasurementResult<Judged>,
  status: RunStatus,
  error?: Error
) {
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

function writeReport(
  folder: string,
  report: string,
  log: (message: string) => void
) {
  const reportFile = path.join(folder, 'report.md');
  fs.writeFileSync(reportFile, report);
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

interface SampleContext<R> {
  session: Session<R>;
  collector: Collector;
  variants: Variants;
  guard: DeviceStateGuard;
  clock: Clock;
  log: (message: string) => void;
}

async function takeCheckedSample<
  S extends JobResult,
  R extends MeasurementResult<S>,
>(
  place: SamplePlace,
  context: SampleContext<R>,
  job: MeasurementJob<S, R>
): Promise<Measured<S>> {
  const { session, variants, guard } = context;
  const { result, device } = session;
  const state = await device.readState();
  guard.checkIdle(state);
  const tracesDir = path.join(session.folder, 'traces');
  fs.mkdirSync(tracesDir, { recursive: true });
  const segment = result.segments.length - 1;
  const sample = await job.measure(
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
  return Object.assign(sample, {
    ...place,
    segment,
    batteryLevel: state.batteryLevel,
  });
}

function keptSamples<S extends JobResult>(
  result: MeasurementResult<S>,
  scenario: Scenario
): Recorded<S>[] {
  return result.incompleteScenario?.scenario === scenario
    ? result.incompleteScenario.samples
    : [];
}

async function buildVariants(
  config: VariantsConfig,
  androidHome: string,
  context: CommandContext,
  dependencies: MeasurementDependencies,
  result: MeasurementResult<Judged>
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

function checkResumable(result: MeasurementResult<Judged>): Variants {
  if (result.status === 'done') {
    throw new ToolError(
      'The run is done. Only a run that is not done can resume.'
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

function checkSameDeviceState(
  stored: DeviceState,
  current: DeviceState,
  keys: readonly (keyof DeviceState)[]
) {
  const changes = changedStateKeys(stored, current, idleKeysOf(keys));
  if (changes.length > 0) {
    throw new ToolError(
      `The device state is not the same as at the start of the run: ${changes.join(', ')}`
    );
  }
}

function startSegment(result: MeasurementResult<Judged>, device: DeviceState) {
  const previousSegment = result.segments.length - 1;
  if (result.segments[previousSegment].status === 'running') {
    result.segments[previousSegment].status = 'interrupted';
  }
  const incomplete = result.incompleteScenario;
  if (incomplete) {
    const abandoned = incomplete.samples.filter((sample) => !sample.accepted);
    if (abandoned.length > 0) {
      result.abandonedScenarios.push({
        ...incomplete,
        samples: abandoned,
        segment: previousSegment,
      });
    }
    result.incompleteScenario = {
      ...incomplete,
      samples: incomplete.samples.filter((sample) => sample.accepted),
    };
  }
  result.status = 'running';
  result.error = undefined;
  result.finishedAt = undefined;
  result.segments.push({
    startedAt: new Date().toISOString(),
    status: 'running',
    device,
  });
}
