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

export interface SampleOptions {
  command: 'sample';
  serial: string;
  applicationId: string;
  scenario: Scenario;
  load?: number;
  keepTrace: boolean;
  traceProcessor?: string;
}

export type Command = RunOptions | SampleOptions | { command: 'help' };

export const USAGE = `Usage:
  node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> --serial <adb serial> [--blocks ${DEFAULT_BLOCKS}] [--noise-limits <file.json>] [--keep-traces] [--trace-processor <path>]
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
  blocks: { type: 'string' },
  'noise-limits': { type: 'string' },
  'keep-traces': { type: 'boolean' },
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
    const values = parseOptions(rest, RUN_OPTIONS);
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
  if (command === 'sample') {
    const values = parseOptions(rest, SAMPLE_OPTIONS);
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

type Values = Record<string, string | boolean | undefined>;

function parseOptions(args: string[], options: ParseArgsOptionsConfig): Values {
  try {
    return parseArgs({ args, options, strict: true, allowPositionals: false })
      .values as Values;
  } catch (error) {
    throw new ToolError(`${(error as Error).message}\n\n${USAGE}`);
  }
}

function required(values: Values, name: string): string {
  const value = values[name];
  if (typeof value !== 'string' || value === '') {
    throw new ToolError(`--${name} is required.\n\n${USAGE}`);
  }
  return value;
}

function positiveInteger(
  value: string | boolean | undefined,
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
