import path from 'node:path';
import { parseArgs } from 'node:util';
import type { ParseArgsOptionsConfig } from 'node:util';

import { ToolError } from './errors.mts';
import {
  DEFAULT_DURATION_SECONDS,
  DEFAULT_INTERVAL_SECONDS,
  DEFAULT_LAUNCHES,
  DEFAULT_SLOPE_LIMIT,
  checkSchedule,
} from './memory-series.mts';
import type { DeviceTarget } from './platform.mts';
import { SCENARIOS, isScenario } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import { DEFAULT_BLOCKS } from './session.mts';

export interface RunOptions {
  command: 'run';
  config: string;
  device: DeviceTarget;
  blocks: number;
  noiseLimits?: string;
  keepTraces: boolean;
  traceProcessor?: string;
  signCommand?: string;
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

export type Command =
  | RunOptions
  | ResumeOptions
  | MemoryOptions
  | MemoryResumeOptions
  | NoiseLimitsOptions
  | SampleOptions
  | { command: 'help' };

export const USAGE = `Usage:
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> <device> [--blocks ${DEFAULT_BLOCKS}] [--noise-limits <file.json>] [--keep-traces] [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --resume <run folder> <device> [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --config <file.json> --scenario <name> <device> [--launches ${DEFAULT_LAUNCHES}] [--interval ${DEFAULT_INTERVAL_SECONDS}] [--duration ${DEFAULT_DURATION_SECONDS}] [--slope-limit ${DEFAULT_SLOPE_LIMIT}] [--keep-traces] [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --resume <run folder> <device> [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits --runs <run folder> [<run folder> ...]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts sample <device> --package <application id> --scenario <name> [--load <integer>] [--keep-trace] [--trace-processor <path>]

<device> is --serial <adb serial> for Android or --udid <UDID> for iOS. The memory command supports Android only.
An iOS run also takes --sign-command <path>.

Scenarios: ${SCENARIOS.join(', ')}
See apps/benchmark-app/scripts/README.md.`;

const COMMON_OPTIONS: ParseArgsOptionsConfig = {
  serial: { type: 'string' },
  udid: { type: 'string' },
  'trace-processor': { type: 'string' },
};

const RUN_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  config: { type: 'string' },
  resume: { type: 'string' },
  blocks: { type: 'string' },
  'noise-limits': { type: 'string' },
  'keep-traces': { type: 'boolean' },
  'sign-command': { type: 'string' },
};

const STORED_RUN_OPTIONS = [
  'config',
  'blocks',
  'noise-limits',
  'keep-traces',
  'sign-command',
];

const MEMORY_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  config: { type: 'string' },
  resume: { type: 'string' },
  scenario: { type: 'string' },
  launches: { type: 'string' },
  interval: { type: 'string' },
  duration: { type: 'string' },
  'slope-limit': { type: 'string' },
  'keep-traces': { type: 'boolean' },
};

const STORED_MEMORY_OPTIONS = [
  'config',
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
        ...resumeOptions(values, STORED_RUN_OPTIONS),
      };
    }
    const device = deviceTarget(values);
    return {
      command,
      config: required(values, 'config'),
      device,
      blocks: optionalPositiveInteger(values, 'blocks', DEFAULT_BLOCKS),
      noiseLimits: optionalString(values, 'noise-limits'),
      keepTraces: values['keep-traces'] === true,
      traceProcessor: optionalString(values, 'trace-processor'),
      signCommand: signCommand(values, device),
    };
  }
  if (command === 'memory') {
    const { values } = parseOptions(rest, MEMORY_OPTIONS);
    if (values.resume !== undefined) {
      androidTarget(values);
      return {
        command: 'memory-resume',
        ...resumeOptions(values, STORED_MEMORY_OPTIONS),
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
      device: deviceTarget(values),
      applicationId: required(values, 'package'),
      scenario: requiredScenario(values),
      load:
        values.load === undefined
          ? undefined
          : positiveInteger(values.load, 'load'),
      keepTrace: values['keep-trace'] === true,
      traceProcessor: optionalString(values, 'trace-processor'),
    };
  }
  throw new ToolError(`Unknown command "${command}".\n\n${USAGE}`);
}

type Values = Record<string, string | string[] | boolean | undefined>;

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
  storedOptions: readonly string[]
): Omit<ResumeOptions, 'command'> {
  const stored = storedOptions.filter((name) => values[name] !== undefined);
  if (stored.length > 0) {
    throw new ToolError(
      `--resume takes ${storedOptions.map((name) => `--${name}`).join(', ')} from the stored result. Remove ${stored.map((name) => `--${name}`).join(', ')}.`
    );
  }
  return {
    folder: required(values, 'resume'),
    device: deviceTarget(values),
    traceProcessor: optionalString(values, 'trace-processor'),
  };
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
    device: androidTarget(values),
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

function androidTarget(values: Values): DeviceTarget {
  const device = deviceTarget(values);
  if (device.platform !== 'android') {
    throw new ToolError(
      'The memory command supports Android only. Give --serial <adb serial>.'
    );
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

function signCommand(values: Values, device: DeviceTarget): string | undefined {
  const command = optionalString(values, 'sign-command');
  if (device.platform === 'ios' && !command) {
    throw new ToolError(`An iOS run needs --sign-command.\n\n${USAGE}`);
  }
  if (device.platform === 'android' && command) {
    throw new ToolError('--sign-command is for an iOS run only.');
  }
  return command === undefined ? undefined : path.resolve(command);
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

function required(values: Values, name: string): string {
  const value = values[name];
  if (typeof value !== 'string' || value === '') {
    throw new ToolError(`--${name} is required.\n\n${USAGE}`);
  }
  return value;
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

function optionalPositiveInteger(
  values: Values,
  name: string,
  defaultValue: number
): number {
  return values[name] === undefined
    ? defaultValue
    : positiveInteger(values[name], name);
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

function optionalString(values: Values, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' ? value : undefined;
}
