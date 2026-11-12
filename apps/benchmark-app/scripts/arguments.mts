import { parseArgs } from 'node:util';
import type { ParseArgsOptionsConfig } from 'node:util';

import { ToolError } from './errors.mts';
import { SCENARIOS, isScenario } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import { DEFAULT_BLOCKS } from './session.mts';

export interface RunOptions {
  command: 'run';
  config: string;
  serial: string;
  blocks: number;
  noiseLimits?: string;
  keepTraces: boolean;
  traceProcessor?: string;
}

export interface ResumeOptions {
  command: 'resume';
  folder: string;
  serial: string;
  traceProcessor?: string;
}

export interface NoiseLimitsOptions {
  command: 'noise-limits';
  runs: string[];
}

export interface SampleOptions {
  command: 'sample';
  serial: string;
  applicationId: string;
  scenario: Scenario;
  load?: number;
  keepTrace: boolean;
  traceProcessor?: string;
}

export type Command =
  | RunOptions
  | ResumeOptions
  | NoiseLimitsOptions
  | SampleOptions
  | { command: 'help' };

export const USAGE = `Usage:
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> --serial <adb serial> [--blocks ${DEFAULT_BLOCKS}] [--noise-limits <file.json>] [--keep-traces] [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --resume <run folder> --serial <adb serial> [--trace-processor <path>]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits --runs <run folder> [<run folder> ...]
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts sample --serial <adb serial> --package <application id> --scenario <name> [--load <integer>] [--keep-trace] [--trace-processor <path>]

Scenarios: ${SCENARIOS.join(', ')}
See apps/benchmark-app/scripts/README.md.`;

const COMMON_OPTIONS: ParseArgsOptionsConfig = {
  serial: { type: 'string' },
  'trace-processor': { type: 'string' },
};

const RUN_OPTIONS: ParseArgsOptionsConfig = {
  ...COMMON_OPTIONS,
  config: { type: 'string' },
  resume: { type: 'string' },
  blocks: { type: 'string' },
  'noise-limits': { type: 'string' },
  'keep-traces': { type: 'boolean' },
};

const STORED_RUN_OPTIONS = ['config', 'blocks', 'noise-limits', 'keep-traces'];

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
      return resumeOptions(values);
    }
    return {
      command,
      config: required(values, 'config'),
      serial: required(values, 'serial'),
      blocks:
        values.blocks === undefined
          ? DEFAULT_BLOCKS
          : positiveInteger(values.blocks, 'blocks'),
      noiseLimits: optionalString(values, 'noise-limits'),
      keepTraces: values['keep-traces'] === true,
      traceProcessor: optionalString(values, 'trace-processor'),
    };
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
    const scenario = required(values, 'scenario');
    if (!isScenario(scenario)) {
      throw new ToolError(
        `Unknown scenario "${scenario}". Known: ${SCENARIOS.join(', ')}`
      );
    }
    return {
      command,
      serial: required(values, 'serial'),
      applicationId: required(values, 'package'),
      scenario,
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

function resumeOptions(values: Values): ResumeOptions {
  const stored = STORED_RUN_OPTIONS.filter(
    (name) => values[name] !== undefined
  );
  if (stored.length > 0) {
    throw new ToolError(
      `--resume takes the config, the blocks, the noise limits and --keep-traces from the stored result. Remove ${stored.map((name) => `--${name}`).join(', ')}.`
    );
  }
  return {
    command: 'resume',
    folder: required(values, 'resume'),
    serial: required(values, 'serial'),
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

function optionalString(values: Values, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' ? value : undefined;
}
