import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { once } from './command-context.mts';
import type { CommandContext } from './command-context.mts';
import { VARIANT_KEYS } from './config.mts';
import type { FileSystem, VariantKey, VariantsConfig } from './config.mts';
import { ToolError } from './errors.mts';
import { MEASUREMENT_REVISION } from './measurement-rules.mts';
import { APP_DIR, BUILDS_DIR, RUNS_DIR } from './paths.mts';
import type {
  DeviceIdentity,
  DeviceState,
  DeviceTarget,
  InAppState,
  Platform,
  PlatformOptions,
  PlatformSession,
  SampleOrder,
  Sampling,
  ToolVersions,
} from './platform.mts';
import { platformOf } from './platforms.mts';
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

export interface MeasurementDependencies<S extends Sampling = Sampling> {
  platform: Platform<S>;
  runsDir: string;
}

export type JobResult = Judged & {
  refreshRate?: number;
  inAppState?: InAppState;
};

export interface MeasurementJob<
  S extends JobResult,
  R extends MeasurementResult<S>,
  P extends Sampling = Sampling,
> {
  scenarios: readonly Scenario[];
  comparesBatteryLevel: boolean;
  blocksOf: (scenario: Scenario) => number;
  orderOf: BlockOrder;
  measure: (order: SampleOrder, sampling: P) => Promise<S>;
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
  device: DeviceTarget;
  platformOptions: PlatformOptions;
  folderName: string;
  checkDevice?: (identity: DeviceIdentity) => void;
}

export interface Resume {
  device: DeviceTarget;
  platformOptions: PlatformOptions;
}

interface Run<R, P extends Sampling> {
  result: R;
  folder: string;
  session: PlatformSession<P>;
  traceExtension: string;
}

type Variants = Record<VariantKey, RunVariant>;

export function dependenciesOf(device: DeviceTarget): MeasurementDependencies {
  return { platform: platformOf(device.platform), runsDir: RUNS_DIR };
}

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
  P extends Sampling,
>(
  start: Start,
  createResult: (fields: NewResultFields<S>) => R,
  createJob: (result: R) => MeasurementJob<S, R, P>,
  context: CommandContext,
  dependencies: MeasurementDependencies<P>
): Promise<number> {
  const { platform } = dependencies;
  const session = await connect(
    platform,
    start.device,
    start.platformOptions,
    context
  );
  start.checkDevice?.(platform.deviceIdentity(session.startState));

  const startedAt = new Date().toISOString();
  const folder = createRunFolder(
    dependencies.runsDir,
    new Date(startedAt),
    start.folderName
  );
  const result = createResult({
    formatVersion: FORMAT_VERSION,
    measurementRevision: MEASUREMENT_REVISION,
    platform: platform.name,
    status: 'running',
    startedAt,
    config: start.config,
    serial: start.device.id,
    segments: [{ startedAt, status: 'running', device: session.startState }],
    appRefreshRate: null,
    tools: await session.readToolVersions(),
    variants: {},
    scenarios: [],
    incompleteScenario: null,
    abandonedScenarios: [],
  });
  writeResult(folder, result);
  context.log(`run folder ${folder}`);

  return measure(
    { result, folder, session, traceExtension: platform.traceExtension },
    createJob(result),
    () => buildVariants(start.config, session, context, result, folder),
    context
  );
}

export async function resumeMeasurement<
  S extends JobResult,
  R extends MeasurementResult<S>,
  P extends Sampling,
>(
  folder: string,
  result: R,
  resume: Resume,
  createJob: (result: R) => MeasurementJob<S, R, P>,
  context: CommandContext,
  dependencies: MeasurementDependencies<P>
): Promise<number> {
  const { platform } = dependencies;
  const variants = checkResumable(result, platform);
  const session = await connect(
    platform,
    resume.device,
    resume.platformOptions,
    context
  );
  checkSameTools(result.tools, await session.readToolVersions());
  const job = createJob(result);
  checkSameDeviceState(
    session.stateChanges(result.segments[0].device, job.comparesBatteryLevel)
  );

  result.serial = resume.device.id;
  startSegment(result, session.startState);
  job.clearSummary(result);
  writeResult(folder, result);
  context.log(
    `resume run folder ${folder}, segment ${result.segments.length - 1}, scenarios to measure: ${scenariosWithoutData(result, job.scenarios).join(', ')}`
  );

  return measure(
    { result, folder, session, traceExtension: platform.traceExtension },
    job,
    async () => variants,
    context
  );
}

function connect<P extends Sampling>(
  platform: Platform<P>,
  device: DeviceTarget,
  options: PlatformOptions,
  context: CommandContext
): Promise<PlatformSession<P>> {
  if (device.platform !== platform.name) {
    throw new ToolError(
      `This command measures on ${platform.name}, but the device option is for ${device.platform}`
    );
  }
  return platform.connect(context.processes, device.id, options);
}

async function measure<
  S extends JobResult,
  R extends MeasurementResult<S>,
  P extends Sampling,
>(
  run: Run<R, P>,
  job: MeasurementJob<S, R, P>,
  prepareVariants: () => Promise<Variants>,
  context: CommandContext
): Promise<number> {
  const { result, folder, session } = run;
  const { log } = context;
  const finish = (status: RunStatus, error?: Error) => {
    endSegment(result, status, error);
    writeResult(folder, result);
    job.summarize(result);
    writeResult(folder, result);
    writeReport(folder, job.renderReport(result), log);
  };
  const stop = once(async (status: RunStatus, error?: Error) => {
    await session.cleanUp(
      Object.values(result.variants).map((built) => built.applicationId),
      log
    );
    finish(status, error);
  });
  context.onInterrupt(() => stop('interrupted'));

  try {
    const variants = await prepareVariants();
    writeResult(folder, result);
    await installVariants(session, variants, log);
    const sampleContext: SampleContext<R, P> = {
      run,
      sampling: session.sampling({
        start: result.segments[0].device,
        appRefreshRate: result.appRefreshRate,
        inAppState: result.inAppState ?? null,
        comparesBatteryLevel: job.comparesBatteryLevel,
      }),
      variants,
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
  session: PlatformSession<Sampling>,
  variants: Variants,
  log: (message: string) => void
) {
  for (const key of VARIANT_KEYS) {
    log(`install ${variants[key].applicationId}`);
    await session.install(
      variants[key].installFile,
      variants[key].applicationId
    );
  }
}

interface SampleContext<R, P extends Sampling> {
  run: Run<R, P>;
  sampling: P;
  variants: Variants;
  log: (message: string) => void;
}

async function takeCheckedSample<
  S extends JobResult,
  R extends MeasurementResult<S>,
  P extends Sampling,
>(
  place: SamplePlace,
  context: SampleContext<R, P>,
  job: MeasurementJob<S, R, P>
): Promise<Measured<S>> {
  const { run, sampling, variants } = context;
  const { result } = run;
  const idle = await sampling.checkIdle();
  const tracesDir = path.join(run.folder, 'traces');
  fs.mkdirSync(tracesDir, { recursive: true });
  const segment = result.segments.length - 1;
  const sample = await job.measure(
    {
      applicationId: variants[place.variant].applicationId,
      stopApplicationIds: VARIANT_KEYS.map(
        (key) => variants[key].applicationId
      ),
      scenario: place.scenario,
      traceFile: path.join(
        tracesDir,
        `${place.scenario}-segment${segment}-block${place.block}-attempt${place.attempt}-${place.position}-${place.variant}.${run.traceExtension}`
      ),
      keepTrace: result.options.keepTraces,
    },
    sampling
  );
  result.appRefreshRate ??= sample.refreshRate ?? null;
  result.inAppState ??= sample.inAppState;
  context.log(
    `${place.scenario} block ${place.block} attempt ${place.attempt} ${place.variant.toUpperCase()}: ${sample.valid ? 'valid' : `invalid (${sample.cause}: ${sample.detail})`}`
  );
  return Object.assign(sample, { ...place, segment, ...idle });
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
  session: PlatformSession<Sampling>,
  context: CommandContext,
  result: MeasurementResult<Judged>,
  folder: string
): Promise<Variants> {
  for (const key of VARIANT_KEYS) {
    const built = await session.buildVariant({
      appDir: APP_DIR,
      buildsDir: BUILDS_DIR,
      key,
      variant: config[key],
      processes: context.processes,
      log: context.log,
    });
    const installFile = await session.prepareInstallFile(built, folder);
    result.variants[key] = {
      ...built,
      installFile,
      installFileSha256: sha256File(installFile),
    };
  }
  return result.variants as Variants;
}

function sha256File(file: string): string {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function checkResumable(
  result: MeasurementResult<Judged>,
  platform: Platform<Sampling>
): Variants {
  if (result.status === 'done') {
    throw new ToolError(
      'The run is done. Only a run that is not done can resume.'
    );
  }
  if (result.platform !== platform.name) {
    throw new ToolError(
      `The run measured on ${result.platform}. It cannot resume on ${platform.name}.`
    );
  }
  if (result.measurementRevision !== MEASUREMENT_REVISION) {
    throw new ToolError(
      `The run has the measurement revision ${result.measurementRevision}, and this driver has revision ${MEASUREMENT_REVISION}. A run cannot mix revisions. Start a new run.`
    );
  }
  for (const key of VARIANT_KEYS) {
    checkStoredArtifact(key, result.variants[key]);
  }
  return result.variants as Variants;
}

function checkStoredArtifact(key: VariantKey, variant: RunVariant | undefined) {
  if (variant === undefined) {
    throw new ToolError(
      `The run folder has no build of variant ${key}. This run cannot resume. Start a new run.`
    );
  }
  if (!fs.existsSync(variant.installFile)) {
    throw new ToolError(
      `The install file of variant ${key} does not exist any more: ${variant.installFile}`
    );
  }
  if (sha256File(variant.installFile) !== variant.installFileSha256) {
    throw new ToolError(
      `The install file of variant ${key} changed after the run started: ${variant.installFile}`
    );
  }
}

function checkSameTools(stored: ToolVersions, current: ToolVersions) {
  const storedVersions: Record<string, string> = { ...stored };
  const changes = Object.entries(current)
    .filter(([key, version]) => storedVersions[key] !== version)
    .map(([key, version]) => `${key}: ${storedVersions[key]} -> ${version}`);
  if (changes.length > 0) {
    throw new ToolError(
      `The tool versions changed after the run started: ${changes.join(', ')}`
    );
  }
}

function checkSameDeviceState(changes: string[]) {
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
