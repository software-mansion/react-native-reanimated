import path from 'node:path';
import { parseArgs } from 'node:util';
import type { ParseArgsOptionsConfig } from 'node:util';

import { MAXIMUM_BLOCKS } from './config.mts';
import { PLATFORM_DEFINITIONS } from './definitions.mts';
import { ToolError } from './errors.mts';
import { parseEpochs } from './in-app-sample.mts';
import type { SampleEpoch } from './in-app-sample.mts';
import {
  DEFAULT_DURATION_SECONDS,
  DEFAULT_INTERVAL_SECONDS,
  DEFAULT_LAUNCHES,
  DEFAULT_SLOPE_LIMIT,
  checkSchedule,
} from './memory-series.mts';
import { MINIMUM_BLOCKS } from './observer-cost.mts';
import { DEFAULT_OUTPUT_DIR, VALIDATION_DIR } from './paths.mts';
import type {
  DeviceTarget,
  PlatformCommand,
  PlatformOption,
} from './platform.mts';
import {
  SCENARIOS,
  VALIDATION_SCENARIOS,
  isAppScenario,
  isScenario,
} from './scenarios.mts';
import type { Scenario } from './scenarios.mts';

export interface RunOptions {
  command: 'run';
  config: string;
  device: DeviceTarget;
  outputDir: string;
  blocks: number;
  noiseLimits?: string;
  keepTraces: boolean;
  traceProcessor?: string;
  signCommand?: string;
  validation?: string;
}

export interface ResumeOptions {
  command: 'resume';
  folder: string;
  device: DeviceTarget;
  traceProcessor?: string;
}

export interface MemoryOptions {
  command: 'memory';
  config: string;
  device: DeviceTarget;
  outputDir: string;
  scenario: Scenario;
  launches: number;
  intervalSeconds: number;
  durationSeconds: number;
  slopeLimit: number;
  keepTraces: boolean;
  traceProcessor?: string;
}

export interface MemoryResumeOptions {
  command: 'memory-resume';
  folder: string;
  device: DeviceTarget;
  traceProcessor?: string;
}

export interface NoiseLimitsOptions {
  command: 'noise-limits';
  runs: string[];
}

export interface SampleOptions {
  command: 'sample';
  device: DeviceTarget;
  applicationId: string;
  scenario: Scenario;
  load?: number;
  keepTrace: boolean;
  traceProcessor?: string;
}

export interface CrosscheckOptions {
  command: 'crosscheck';
  device: DeviceTarget;
  applicationId: string;
  scenario: string;
  load?: number;
  epochs: SampleEpoch[];
  outputDir: string;
}

export interface ValidationRecordOptions {
  command: 'validation-record';
  knownWorks: string[];
  observerCosts: string[];
  crosschecks: string[];
  earlierCrosschecks: string[];
}

export interface KnownWorkOptions {
  command: 'known-work';
  device: DeviceTarget;
  applicationId: string;
  outputDir: string;
}

export interface ObserverCostOptions {
  command: 'observer-cost';
  device: DeviceTarget;
  applicationId: string;
  scenario: Scenario;
  load?: number;
  blocks: number;
  noiseLimits?: string;
  outputDir: string;
}

export type Command =
  | RunOptions
  | ResumeOptions
  | MemoryOptions
  | MemoryResumeOptions
  | NoiseLimitsOptions
  | SampleOptions
  | CrosscheckOptions
  | ObserverCostOptions
  | KnownWorkOptions
  | ValidationRecordOptions
  | { command: 'help' };

type Values = Record<string, string | string[] | boolean | undefined>;

const DEFAULT_BLOCKS = 5;

const DEFAULT_OBSERVER_COST_BLOCKS = 10;

export const USAGE = `Usage:
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> <device> [--blocks ${DEFAULT_BLOCKS}] [--noise-limits <file.json>] [--validation <file.json>] [--output-dir <dir>] [--keep-traces] [--trace-processor <path>] [--sign-command <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --resume <run folder> <device> [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --config <file.json> --scenario <name> <device> [--output-dir <dir>] [--launches ${DEFAULT_LAUNCHES}] [--interval ${DEFAULT_INTERVAL_SECONDS}] [--duration ${DEFAULT_DURATION_SECONDS}] [--slope-limit ${DEFAULT_SLOPE_LIMIT}] [--keep-traces] [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --resume <run folder> <device> [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits --runs <run folder> [<run folder> ...]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts sample <device> --package <application id> --scenario <name> [--load <integer>] [--keep-trace] [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts crosscheck --udid <UDID> --package <application id> --scenario <name> --epochs <load>:<full|endpoints>:<seconds>[,...] [--load <integer>] [--output-dir <dir>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts observer-cost --udid <UDID> --package <application id> --scenario <name> [--blocks ${DEFAULT_OBSERVER_COST_BLOCKS}] [--noise-limits <file.json>] [--load <integer>] [--output-dir <dir>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts known-work --udid <UDID> --package <application id> [--output-dir <dir>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts validation-record --known-work <folder> [--known-work <folder> ...] --observer-cost <folder> [--observer-cost <folder> ...] [--crosscheck <folder> ...] [--earlier-crosscheck <folder> ...]

<device> is --serial <adb serial> for Android or --udid <UDID> for iOS. The memory command supports Android only. The known-work, observer-cost and crosscheck commands validate the in-app collector of iOS and support iOS only.
--trace-processor, --keep-traces and --keep-trace are for Android only. An iOS run needs --sign-command <path>. Its processInstructionRate gets a verdict only with a matching --validation <file.json>. The other iOS metrics have no verdict.

Scenarios: ${SCENARIOS.join(', ')}
Validation scenarios (crosscheck only): ${VALIDATION_SCENARIOS.join(', ')}
See apps/benchmark-app/scripts/README.md.`;

const PLATFORM_OPTIONS: readonly PlatformOption[] = [
  'trace-processor',
  'sign-command',
  'validation',
  'keep-traces',
  'keep-trace',
];

const COMMON_OPTIONS: ParseArgsOptionsConfig = {
  serial: { type: 'string' },
  udid: { type: 'string' },
  'trace-processor': { type: 'string' },
};

const RUN_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  config: { type: 'string' },
  resume: { type: 'string' },
  'output-dir': { type: 'string' },
  blocks: { type: 'string' },
  'noise-limits': { type: 'string' },
  'keep-traces': { type: 'boolean' },
  'sign-command': { type: 'string' },
  validation: { type: 'string' },
};

const STORED_RUN_OPTIONS = [
  'config',
  'output-dir',
  'blocks',
  'noise-limits',
  'keep-traces',
  'sign-command',
  'validation',
];

const MEMORY_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  config: { type: 'string' },
  resume: { type: 'string' },
  'output-dir': { type: 'string' },
  scenario: { type: 'string' },
  launches: { type: 'string' },
  interval: { type: 'string' },
  duration: { type: 'string' },
  'slope-limit': { type: 'string' },
  'keep-traces': { type: 'boolean' },
};

const STORED_MEMORY_OPTIONS = [
  'config',
  'output-dir',
  'scenario',
  'launches',
  'interval',
  'duration',
  'slope-limit',
  'keep-traces',
];

const NOISE_LIMITS_OPTIONS: ParseArgsOptionsConfig = {
  runs: { type: 'string', multiple: true },
};

const SAMPLE_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  package: { type: 'string' },
  scenario: { type: 'string' },
  load: { type: 'string' },
  'keep-trace': { type: 'boolean' },
};

const CROSSCHECK_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  package: { type: 'string' },
  scenario: { type: 'string' },
  load: { type: 'string' },
  epochs: { type: 'string' },
  'output-dir': { type: 'string' },
};

const VALIDATION_RECORD_OPTIONS: ParseArgsOptionsConfig = {
  'known-work': { type: 'string', multiple: true },
  'observer-cost': { type: 'string', multiple: true },
  crosscheck: { type: 'string', multiple: true },
  'earlier-crosscheck': { type: 'string', multiple: true },
};

const KNOWN_WORK_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  package: { type: 'string' },
  'output-dir': { type: 'string' },
};

const OBSERVER_COST_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  package: { type: 'string' },
  scenario: { type: 'string' },
  load: { type: 'string' },
  blocks: { type: 'string' },
  'noise-limits': { type: 'string' },
  'output-dir': { type: 'string' },
};

export function parseArguments(argv: string[]): Command {
  const [command, ...rest] = argv;
  if (
    command === undefined ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    return { command: 'help' };
  }
  if (command === 'run') {
    const { values } = parseOptions(rest, RUN_OPTIONS);
    if (values.resume !== undefined) {
      return {
        command: 'resume',
        ...resumeOptions(values, STORED_RUN_OPTIONS, 'run'),
      };
    }
    const device = platformTarget(values, 'run');
    const signCommand = optionalString(values, 'sign-command');
    return {
      command,
      config: required(values, 'config'),
      device,
      outputDir: outputDirOf(values),
      blocks: runBlocks(values),
      noiseLimits: optionalString(values, 'noise-limits'),
      keepTraces: values['keep-traces'] === true,
      traceProcessor: optionalString(values, 'trace-processor'),
      signCommand:
        signCommand === undefined ? undefined : path.resolve(signCommand),
      validation: optionalString(values, 'validation'),
    };
  }
  if (command === 'memory') {
    const { values } = parseOptions(rest, MEMORY_OPTIONS);
    if (values.resume !== undefined) {
      return {
        command: 'memory-resume',
        ...resumeOptions(values, STORED_MEMORY_OPTIONS, 'memory'),
      };
    }
    return memoryOptions(values);
  }
  if (command === 'noise-limits') {
    const { values, positionals } = parseOptions(
      rest,
      NOISE_LIMITS_OPTIONS,
      true
    );
    if (!Array.isArray(values.runs)) {
      throw new ToolError(`--runs is required.\n\n${USAGE}`);
    }
    return { command, runs: [...values.runs, ...positionals] };
  }
  if (command === 'sample') {
    const { values } = parseOptions(rest, SAMPLE_OPTIONS);
    return {
      command,
      device: platformTarget(values, 'sample'),
      applicationId: required(values, 'package'),
      scenario: requiredScenario(values),
      load: optionalLoad(values),
      keepTrace: values['keep-trace'] === true,
      traceProcessor: optionalString(values, 'trace-processor'),
    };
  }
  if (command === 'crosscheck') {
    const { values } = parseOptions(rest, CROSSCHECK_OPTIONS);
    return {
      command,
      device: platformTarget(values, 'crosscheck'),
      applicationId: required(values, 'package'),
      scenario: requiredAppScenario(values),
      load: optionalLoad(values),
      epochs: requiredEpochs(values),
      outputDir: validationDirOf(values),
    };
  }
  if (command === 'observer-cost') {
    const { values } = parseOptions(rest, OBSERVER_COST_OPTIONS);
    return {
      command,
      device: platformTarget(values, 'observer-cost'),
      applicationId: required(values, 'package'),
      scenario: requiredScenario(values),
      load: optionalLoad(values),
      blocks: observerCostBlocks(values),
      noiseLimits: optionalString(values, 'noise-limits'),
      outputDir: validationDirOf(values),
    };
  }
  if (command === 'known-work') {
    const { values } = parseOptions(rest, KNOWN_WORK_OPTIONS);
    return {
      command,
      device: platformTarget(values, 'known-work'),
      applicationId: required(values, 'package'),
      outputDir: validationDirOf(values),
    };
  }
  if (command === 'validation-record') {
    const { values } = parseOptions(rest, VALIDATION_RECORD_OPTIONS);
    return {
      command,
      knownWorks: optionalList(values, 'known-work'),
      observerCosts: requiredList(values, 'observer-cost'),
      crosschecks: optionalList(values, 'crosscheck'),
      earlierCrosschecks: optionalList(values, 'earlier-crosscheck'),
    };
  }
  throw new ToolError(`Unknown command "${command}".\n\n${USAGE}`);
}

function parseOptions(
  args: string[],
  options: ParseArgsOptionsConfig,
  allowPositionals = false
): { values: Values; positionals: string[] } {
  try {
    const parsed = parseArgs({ args, options, strict: true, allowPositionals });
    return { values: parsed.values as Values, positionals: parsed.positionals };
  } catch (error) {
    throw new ToolError(`${(error as Error).message}\n\n${USAGE}`);
  }
}

function resumeOptions(
  values: Values,
  storedOptions: readonly string[],
  command: PlatformCommand
): Omit<ResumeOptions, 'command'> {
  const stored = storedOptions.filter((name) => values[name] !== undefined);
  if (stored.length > 0) {
    throw new ToolError(
      `--resume takes ${storedOptions.map((name) => `--${name}`).join(', ')} from the stored result. Remove ${stored.map((name) => `--${name}`).join(', ')}.`
    );
  }
  return {
    folder: required(values, 'resume'),
    device: platformTarget(values, command, false),
    traceProcessor: optionalString(values, 'trace-processor'),
  };
}

function required(values: Values, name: string): string {
  const value = values[name];
  if (typeof value !== 'string' || value === '') {
    throw new ToolError(`--${name} is required.\n\n${USAGE}`);
  }
  return value;
}

function platformTarget(
  values: Values,
  command: PlatformCommand,
  startsMeasurement = true
): DeviceTarget {
  const device = deviceTarget(values);
  const definition = PLATFORM_DEFINITIONS[device.platform];
  if (!definition.commands.includes(command)) {
    throw new ToolError(
      `The ${command} command is not supported on ${device.platform}.`
    );
  }
  for (const option of PLATFORM_OPTIONS) {
    const rule = definition.options[option];
    if (values[option] !== undefined && rule === undefined) {
      throw new ToolError(
        `--${option} is not an option on ${device.platform}.`
      );
    }
    if (
      values[option] === undefined &&
      rule === 'required for run' &&
      command === 'run' &&
      startsMeasurement
    ) {
      throw new ToolError(
        `A run on ${device.platform} needs --${option}.\n\n${USAGE}`
      );
    }
  }
  return device;
}

function deviceTarget(values: Values): DeviceTarget {
  const serial = optionalString(values, 'serial');
  const udid = optionalString(values, 'udid');
  if (serial && udid) {
    throw new ToolError('Give --serial or --udid, not the two together.');
  }
  if (udid) {
    return { platform: 'ios', id: udid };
  }
  return { platform: 'android', id: required(values, 'serial') };
}

function optionalString(values: Values, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' ? value : undefined;
}

function outputDirOf(values: Values): string {
  return path.resolve(
    optionalString(values, 'output-dir') ?? DEFAULT_OUTPUT_DIR
  );
}

function runBlocks(values: Values): number {
  const blocks = optionalPositiveInteger(values, 'blocks', DEFAULT_BLOCKS);
  if (blocks > MAXIMUM_BLOCKS) {
    throw new ToolError(
      `--blocks must be at most ${MAXIMUM_BLOCKS} for the run command, not ${blocks}`
    );
  }
  return blocks;
}

function observerCostBlocks(values: Values): number {
  const blocks = optionalPositiveInteger(
    values,
    'blocks',
    DEFAULT_OBSERVER_COST_BLOCKS
  );
  if (blocks < MINIMUM_BLOCKS) {
    throw new ToolError(
      `--blocks must be at least ${MINIMUM_BLOCKS} for the observer-cost command, not ${blocks}`
    );
  }
  return blocks;
}

function requiredList(values: Values, name: string): string[] {
  const value = values[name];
  if (!Array.isArray(value) || value.length === 0) {
    throw new ToolError(`--${name} is required.\n\n${USAGE}`);
  }
  return value;
}

function optionalList(values: Values, name: string): string[] {
  const value = values[name];
  return Array.isArray(value) ? value : [];
}

function validationDirOf(values: Values): string {
  return path.resolve(optionalString(values, 'output-dir') ?? VALIDATION_DIR);
}

function optionalLoad(values: Values): number | undefined {
  return values.load === undefined
    ? undefined
    : positiveInteger(values.load, 'load');
}

function requiredEpochs(values: Values): SampleEpoch[] {
  try {
    return parseEpochs(required(values, 'epochs'));
  } catch (error) {
    throw new ToolError(`--epochs: ${(error as Error).message}`);
  }
}

function optionalPositiveInteger(
  values: Values,
  name: string,
  defaultValue: number
): number {
  return values[name] === undefined
    ? defaultValue
    : positiveInteger(values[name], name);
}

function positiveInteger(
  value: string | string[] | boolean | undefined,
  name: string
): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new ToolError(
      `--${name} must be a positive integer, not "${String(value)}"`
    );
  }
  return number;
}

function memoryOptions(values: Values): MemoryOptions {
  const launches = optionalPositiveInteger(
    values,
    'launches',
    DEFAULT_LAUNCHES
  );
  const intervalSeconds = optionalPositiveInteger(
    values,
    'interval',
    DEFAULT_INTERVAL_SECONDS
  );
  const durationSeconds = optionalPositiveInteger(
    values,
    'duration',
    DEFAULT_DURATION_SECONDS
  );
  checkSchedule({ intervalSeconds, durationSeconds });
  return {
    command: 'memory',
    config: required(values, 'config'),
    device: platformTarget(values, 'memory'),
    outputDir: outputDirOf(values),
    scenario: requiredScenario(values),
    launches,
    intervalSeconds,
    durationSeconds,
    slopeLimit:
      values['slope-limit'] === undefined
        ? DEFAULT_SLOPE_LIMIT
        : nonNegativeNumber(values['slope-limit'], 'slope-limit'),
    keepTraces: values['keep-traces'] === true,
    traceProcessor: optionalString(values, 'trace-processor'),
  };
}

function requiredScenario(values: Values): Scenario {
  const scenario = required(values, 'scenario');
  if (!isScenario(scenario)) {
    throw new ToolError(
      `Unknown scenario "${scenario}". Known: ${SCENARIOS.join(', ')}`
    );
  }
  return scenario;
}

function requiredAppScenario(values: Values): string {
  const scenario = required(values, 'scenario');
  if (!isAppScenario(scenario)) {
    throw new ToolError(
      `Unknown scenario "${scenario}". Known: ${[...SCENARIOS, ...VALIDATION_SCENARIOS].join(', ')}`
    );
  }
  return scenario;
}

function nonNegativeNumber(
  value: string | string[] | boolean | undefined,
  name: string
): number {
  const number = Number(value);
  if (value === '' || !Number.isFinite(number) || number < 0) {
    throw new ToolError(
      `--${name} must be a number of 0 or more, not "${String(value)}"`
    );
  }
  return number;
}
