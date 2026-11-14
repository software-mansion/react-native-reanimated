import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { TOOL_ERROR_EXIT_CODE, once } from './command-context.mts';
import type { CommandContext } from './command-context.mts';
import { VARIANT_KEYS } from './config.mts';
import type { VariantKey, VariantsConfig } from './config.mts';
import { PLATFORM_DEFINITIONS } from './definitions.mts';
import { ToolError } from './errors.mts';
import { APP_DIR, BUILDS_DIR, REPORT_FILE } from './paths.mts';
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
  createMeasurementFolder,
  scenariosWithoutData,
  writeResult,
} from './results.mts';
import type {
  MeasurementResult,
  MeasurementStatus,
  MeasuredVariant,
} from './results.mts';
import type { Scenario } from './scenarios.mts';
import { runScenario } from './session.mts';
import type {
  RoundOrder,
  Judged,
  Measured,
  Recorded,
  SamplePlace,
} from './session.mts';
import { writeSummary } from './summary.mts';
import type { MeasurementOutcome } from './summary.mts';

export interface MeasurementDependencies<S extends Sampling = Sampling> {
  platform: Platform<S>;
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
  unitName: string;
  roundsOf: (scenario: Scenario) => number;
  orderOf: RoundOrder;
  measure: (order: SampleOrder, sampling: P) => Promise<S>;
  clearSummary: (result: R) => void;
  summarize: (result: R) => void;
  renderReport: (result: R) => string;
  outcome: (result: R) => MeasurementOutcome;
}

export type NewResultFields<S extends JobResult> = Omit<
  MeasurementResult<S>,
  'command' | 'options'
>;

export interface Start {
  config: VariantsConfig;
  device: DeviceTarget;
  platformOptions: PlatformOptions;
  outputDir: string;
  folderName: string;
  checkDevice?: (identity: DeviceIdentity) => void;
}

export interface Resume {
  device: DeviceTarget;
  platformOptions: PlatformOptions;
}

interface OpenMeasurement<R, P extends Sampling> {
  result: R;
  folder: string;
  session: PlatformSession<P>;
}

type Variants = Record<VariantKey, MeasuredVariant>;

interface Ending {
  error?: Error;
  exit: Pick<MeasurementOutcome, 'exitCode' | 'reason'>;
}

interface SampleContext<R, P extends Sampling> {
  measurement: OpenMeasurement<R, P>;
  sampling: P;
  variants: Variants;
  log: (message: string) => void;
}

const TRACES_DIR = 'traces';

export function dependenciesOf(device: DeviceTarget): MeasurementDependencies {
  return { platform: platformOf(device.platform) };
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
  const tools = await session.readToolVersions();

  const startedAt = new Date().toISOString();
  const folder = createMeasurementFolder(
    start.outputDir,
    new Date(startedAt),
    start.folderName
  );
  const result = createResult({
    formatVersion: FORMAT_VERSION,
    measurementRevision:
      PLATFORM_DEFINITIONS[platform.name].measurementRevision,
    platform: platform.name,
    status: 'running',
    startedAt,
    config: start.config,
    segments: [{ startedAt, status: 'running', device: session.startState }],
    appRefreshRate: null,
    tools,
    variants: {},
    scenarios: [],
    incompleteScenario: null,
    abandonedScenarios: [],
  });
  writeResult(folder, result);
  context.log(`folder ${folder}`);

  return measure(
    { result, folder, session },
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

  startSegment(result, session.startState);
  job.clearSummary(result);
  writeResult(folder, result);
  context.log(
    `resume ${folder}, segment ${result.segments.length - 1}, scenarios to measure: ${scenariosWithoutData(result, job.scenarios).join(', ')}`
  );

  return measure(
    { result, folder, session },
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
  measurement: OpenMeasurement<R, P>,
  job: MeasurementJob<S, R, P>,
  prepareVariants: () => Promise<Variants>,
  context: CommandContext
): Promise<number> {
  const { result, folder, session } = measurement;
  const { log } = context;
  const finish = (status: MeasurementStatus, ending?: Ending) => {
    endSegment(result, status, ending?.error);
    writeResult(folder, result);
    job.summarize(result);
    writeResult(folder, result);
    writeReport(folder, job.renderReport(result), log);
    const outcome = job.outcome(result);
    writeSummary(
      folder,
      result.command,
      status,
      ending ? { ...outcome, ...ending.exit } : outcome
    );
    return outcome.exitCode;
  };
  const stop = once(async (status: MeasurementStatus, ending: Ending) => {
    await session.cleanUp(
      Object.values(result.variants).map((built) => built.applicationId),
      log
    );
    finish(status, ending);
  });
  context.onInterrupt((exitCode) =>
    stop('interrupted', {
      exit: { exitCode, reason: 'The driver got a signal to stop.' },
    })
  );

  try {
    const variants = await prepareVariants();
    writeResult(folder, result);
    await installVariants(session, variants, log);
    const sampleContext: SampleContext<R, P> = {
      measurement,
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
      const outcome = await runScenario({
        scenario,
        rounds: job.roundsOf(scenario),
        orderOf: job.orderOf,
        sampler: (place) => takeCheckedSample(place, sampleContext, job),
        onProgress: (progress) => {
          result.incompleteScenario = progress;
          writeResult(folder, result);
        },
        acceptedSamples: keptSamples(result, scenario),
      });
      result.incompleteScenario = null;
      result.scenarios.push(outcome);
      writeResult(folder, result);
    }

    return finish('done');
  } catch (error) {
    const { message } = error as Error;
    await stop('tool error', {
      error: error as Error,
      exit: { exitCode: TOOL_ERROR_EXIT_CODE, reason: message },
    }).catch((stopError: Error) =>
      log(`cannot write the final result: ${stopError.message}`)
    );
    throw error;
  }
}

function endSegment(
  result: MeasurementResult<Judged>,
  status: MeasurementStatus,
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
  const reportFile = path.join(folder, REPORT_FILE);
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

async function takeCheckedSample<
  S extends JobResult,
  R extends MeasurementResult<S>,
  P extends Sampling,
>(
  place: SamplePlace,
  context: SampleContext<R, P>,
  job: MeasurementJob<S, R, P>
): Promise<Measured<S>> {
  const { measurement, sampling, variants } = context;
  const { result } = measurement;
  const idle = await sampling.checkIdle();
  const segment = result.segments.length - 1;
  const sample = await job.measure(
    {
      applicationId: variants[place.variant].applicationId,
      stopApplicationIds: VARIANT_KEYS.map(
        (key) => variants[key].applicationId
      ),
      scenario: place.scenario,
      outputDir: path.join(measurement.folder, TRACES_DIR),
      sampleName: `${place.scenario}-segment${segment}-${job.unitName}${place.round}-attempt${place.attempt}-${place.position}-${place.variant}`,
      keepTrace: result.options.keepTraces,
    },
    sampling
  );
  result.appRefreshRate ??= sample.refreshRate ?? null;
  result.inAppState ??= sample.inAppState;
  context.log(
    `${place.scenario} ${job.unitName} ${place.round} attempt ${place.attempt} ${place.variant.toUpperCase()}: ${sample.valid ? 'valid' : `invalid (${sample.cause}: ${sample.detail})`}`
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
      'The measurement is done. Only a measurement that is not done can resume.'
    );
  }
  if (result.platform !== platform.name) {
    throw new ToolError(
      `The measurement ran on ${result.platform}. It cannot resume on ${platform.name}.`
    );
  }
  const { measurementRevision } = PLATFORM_DEFINITIONS[platform.name];
  if (result.measurementRevision !== measurementRevision) {
    throw new ToolError(
      `The measurement has the revision ${result.measurementRevision}, and this driver has revision ${measurementRevision} for ${platform.name}. A measurement cannot mix revisions. Start a new one.`
    );
  }
  for (const key of VARIANT_KEYS) {
    checkStoredArtifact(key, result.variants[key]);
  }
  return result.variants as Variants;
}

function checkStoredArtifact(
  key: VariantKey,
  variant: MeasuredVariant | undefined
) {
  if (variant === undefined) {
    throw new ToolError(
      `The folder has no build of variant ${key}. This measurement cannot resume. Start a new one.`
    );
  }
  if (!fs.existsSync(variant.installFile)) {
    throw new ToolError(
      `The install file of variant ${key} does not exist any more: ${variant.installFile}`
    );
  }
  if (sha256File(variant.installFile) !== variant.installFileSha256) {
    throw new ToolError(
      `The install file of variant ${key} changed after the measurement started: ${variant.installFile}`
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
      `The tool versions changed after the measurement started: ${changes.join(', ')}`
    );
  }
}

function checkSameDeviceState(changes: string[]) {
  if (changes.length > 0) {
    throw new ToolError(
      `The device state is not the same as at the start of the measurement: ${changes.join(', ')}`
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
