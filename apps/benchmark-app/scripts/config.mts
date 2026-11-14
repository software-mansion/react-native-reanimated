import fs from 'node:fs';
import path from 'node:path';

import { readJson } from './json-file.mts';
import type { ComparedMetric } from './metrics.mts';
import type { PlatformDefinition } from './platform.mts';
import { SCENARIOS, SCENARIO_REQUIREMENTS, isScenario } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import { record, throwProblems } from './validation.mts';

export type VariantKey = 'a' | 'b';

export type PackageSource =
  | { kind: 'npm'; version: string }
  | { kind: 'tarball'; path: string };

export type StaticFlags = Record<string, boolean>;

export interface Variant {
  reanimated: PackageSource;
  worklets: PackageSource;
  reanimatedFlags: StaticFlags;
  workletsFlags: StaticFlags;
  bundleMode: boolean;
  profiling: boolean;
}

export interface Expectation {
  scenarios: Scenario[];
  metrics: ComparedMetric[];
  is: 'notWorse' | 'better';
  byAtLeast?: number;
}

export type ScenarioBlocks = Partial<Record<Scenario, number>>;

export interface VariantsConfig {
  name: string;
  a: Variant;
  b: Variant;
  note?: string;
}

export interface RunConfig extends VariantsConfig {
  scenarios: Scenario[];
  blocks?: ScenarioBlocks;
  expect: Expectation[];
}

export interface FileSystem {
  isFile: (file: string) => boolean;
}

export const VARIANT_KEYS: readonly VariantKey[] = ['a', 'b'];

const RUN_FIELDS = ['name', 'a', 'b', 'scenarios', 'blocks', 'expect', 'note'];

const VARIANT_FIELDS = [
  'reanimated',
  'worklets',
  'reanimatedFlags',
  'workletsFlags',
  'bundleMode',
  'profiling',
];

const EXPECTATION_FIELDS = ['scenarios', 'metrics', 'is', 'byAtLeast'];

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const NPM_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const FLAG_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export function readConfigFile<C>(
  file: string,
  validate: (raw: unknown, configDir: string, fileSystem: FileSystem) => C
): C {
  return validate(readJson(file), path.dirname(path.resolve(file)), {
    isFile: (candidate) =>
      fs.statSync(candidate, { throwIfNoEntry: false })?.isFile() ?? false,
  });
}

export function validateConfig(
  raw: unknown,
  configDir: string,
  fileSystem: FileSystem,
  definition: PlatformDefinition
): RunConfig {
  const problems: string[] = [];
  const config = record(raw, 'config', problems);
  rejectUnknownFields(config, RUN_FIELDS, 'config', problems);
  const variants = readVariantsConfig(config, configDir, fileSystem, problems);
  const scenarios = validateScenarios(config.scenarios, problems);
  checkRequiredFlags(variants, scenarios, problems);
  const blocks = validateBlocks(config.blocks, scenarios, problems);
  const expect = validateExpectations(
    config.expect,
    scenarios,
    definition.verdictMetrics,
    problems
  );
  throwConfigProblems(problems);
  return {
    ...variants,
    scenarios,
    ...(blocks === undefined ? {} : { blocks }),
    expect,
  };
}

export function validateVariantsConfig(
  raw: unknown,
  configDir: string,
  fileSystem: FileSystem,
  scenarios: readonly Scenario[]
): VariantsConfig {
  const problems: string[] = [];
  const variants = readVariantsConfig(
    record(raw, 'config', problems),
    configDir,
    fileSystem,
    problems
  );
  checkRequiredFlags(variants, scenarios, problems);
  throwConfigProblems(problems);
  return variants;
}

export function blocksOf(
  config: RunConfig,
  scenario: Scenario,
  defaultBlocks: number
): number {
  return config.blocks?.[scenario] ?? defaultBlocks;
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  known: readonly string[],
  label: string,
  problems: string[]
) {
  for (const field of Object.keys(value)) {
    if (!known.includes(field)) {
      problems.push(`${label}: unknown field "${field}"`);
    }
  }
}

function readVariantsConfig(
  config: Record<string, unknown>,
  configDir: string,
  fileSystem: FileSystem,
  problems: string[]
): VariantsConfig {
  const name = config.name;
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    problems.push(
      'config.name must be a string of letters, digits, ".", "_" or "-"'
    );
  }
  const a = validateVariant(config.a, 'a', configDir, fileSystem, problems);
  const b = validateVariant(config.b, 'b', configDir, fileSystem, problems);
  if (config.note !== undefined && typeof config.note !== 'string') {
    problems.push('config.note must be a string');
  }
  return {
    name: name as string,
    a,
    b,
    ...(config.note === undefined ? {} : { note: config.note as string }),
  };
}

function validateVariant(
  value: unknown,
  key: VariantKey,
  configDir: string,
  fileSystem: FileSystem,
  problems: string[]
): Variant {
  const label = `config.${key}`;
  const variant = record(value, label, problems);
  rejectUnknownFields(variant, VARIANT_FIELDS, label, problems);
  const bundleMode = optionalBoolean(
    variant.bundleMode,
    `${label}.bundleMode`,
    problems
  );
  if (bundleMode) {
    problems.push(
      `${label}.bundleMode: true is not supported in this version (a Release bundle with Bundle Mode needs a Metro patch that is not published)`
    );
  }
  return {
    reanimated: validateSource(
      variant.reanimated,
      `${label}.reanimated`,
      configDir,
      fileSystem,
      problems
    ),
    worklets: validateSource(
      variant.worklets,
      `${label}.worklets`,
      configDir,
      fileSystem,
      problems
    ),
    reanimatedFlags: validateFlags(
      variant.reanimatedFlags,
      `${label}.reanimatedFlags`,
      problems
    ),
    workletsFlags: validateFlags(
      variant.workletsFlags,
      `${label}.workletsFlags`,
      problems
    ),
    bundleMode,
    profiling: optionalBoolean(
      variant.profiling,
      `${label}.profiling`,
      problems
    ),
  };
}

function optionalBoolean(
  value: unknown,
  label: string,
  problems: string[]
): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value !== 'boolean') {
    problems.push(`${label} must be true or false`);
    return false;
  }
  return value;
}

function validateSource(
  value: unknown,
  label: string,
  configDir: string,
  fileSystem: FileSystem,
  problems: string[]
): PackageSource {
  if (typeof value === 'string' && NPM_VERSION_PATTERN.test(value)) {
    return { kind: 'npm', version: value };
  }
  if (typeof value === 'string' && value.endsWith('.tgz')) {
    const tarball = path.resolve(configDir, value);
    if (!fileSystem.isFile(tarball)) {
      problems.push(`${label}: no file at ${tarball}`);
    }
    return { kind: 'tarball', path: tarball };
  }
  problems.push(
    `${label} must be an exact npm version (for example 4.7.1) or a path to a .tgz file from npm pack`
  );
  return { kind: 'npm', version: '' };
}

function validateFlags(
  value: unknown,
  label: string,
  problems: string[]
): StaticFlags {
  if (value === undefined) {
    return {};
  }
  const flags: StaticFlags = {};
  for (const [name, flag] of Object.entries(record(value, label, problems))) {
    if (!FLAG_NAME_PATTERN.test(name) || typeof flag !== 'boolean') {
      problems.push(
        `${label}.${name} must be an upper-case flag name with a boolean value`
      );
    } else {
      flags[name] = flag;
    }
  }
  return flags;
}

function validateScenarios(value: unknown, problems: string[]): Scenario[] {
  if (!Array.isArray(value) || value.length === 0) {
    problems.push(
      `config.scenarios must be a list of one or more of: ${SCENARIOS.join(', ')}`
    );
    return [];
  }
  const unknown = value.filter((name) => !isScenario(name));
  if (unknown.length > 0) {
    problems.push(
      `config.scenarios: unknown scenario ${unknown.map((name) => JSON.stringify(name)).join(', ')} (known: ${SCENARIOS.join(', ')})`
    );
  }
  if (new Set(value).size !== value.length) {
    problems.push('config.scenarios must not repeat a scenario');
  }
  return value.filter(isScenario);
}

function checkRequiredFlags(
  variants: VariantsConfig,
  scenarios: readonly Scenario[],
  problems: string[]
) {
  for (const scenario of scenarios) {
    for (const flag of SCENARIO_REQUIREMENTS[scenario].reanimatedFlags) {
      for (const key of VARIANT_KEYS) {
        if (variants[key].reanimatedFlags[flag] !== true) {
          problems.push(
            `config.${key}.reanimatedFlags.${flag} must be true for the scenario ${scenario}. The driver does not know the default of a flag in a library version, so set the flag in both variants.`
          );
        }
      }
    }
  }
}

function validateBlocks(
  value: unknown,
  runScenarios: Scenario[],
  problems: string[]
): ScenarioBlocks | undefined {
  if (value === undefined) {
    return undefined;
  }
  const blocks: ScenarioBlocks = {};
  for (const [scenario, count] of Object.entries(
    record(value, 'config.blocks', problems)
  )) {
    if (!runScenarios.includes(scenario as Scenario)) {
      problems.push(
        `config.blocks: "${scenario}" is not a scenario of this run (run: ${runScenarios.join(', ')})`
      );
    } else if (!Number.isInteger(count) || (count as number) < 1) {
      problems.push(`config.blocks.${scenario} must be a positive integer`);
    } else {
      blocks[scenario as Scenario] = count as number;
    }
  }
  return blocks;
}

function validateExpectations(
  value: unknown,
  runScenarios: Scenario[],
  verdictMetrics: readonly ComparedMetric[],
  problems: string[]
): Expectation[] {
  if (value === undefined) {
    return [
      {
        scenarios: runScenarios,
        metrics: [...verdictMetrics],
        is: 'notWorse',
      },
    ];
  }
  if (!Array.isArray(value) || value.length === 0) {
    problems.push('config.expect must be a list of one or more entries');
    return [];
  }
  return value.map((entry, i) =>
    validateExpectation(
      entry,
      `config.expect[${i}]`,
      runScenarios,
      verdictMetrics,
      problems
    )
  );
}

function validateExpectation(
  value: unknown,
  label: string,
  runScenarios: Scenario[],
  verdictMetrics: readonly ComparedMetric[],
  problems: string[]
): Expectation {
  const entry = record(value, label, problems);
  rejectUnknownFields(entry, EXPECTATION_FIELDS, label, problems);

  const scenarios = selection(
    entry.scenarios,
    `${label}.scenarios`,
    runScenarios,
    problems,
    (name) => runScenarios.includes(name as Scenario)
  ) as Scenario[];
  const metrics = selection(
    entry.metrics,
    `${label}.metrics`,
    verdictMetrics,
    problems,
    (name) => verdictMetrics.includes(name as ComparedMetric)
  ) as ComparedMetric[];

  if (entry.is !== 'notWorse' && entry.is !== 'better') {
    problems.push(`${label}.is must be "notWorse" or "better"`);
  }
  const byAtLeast = entry.byAtLeast;
  if (byAtLeast !== undefined) {
    if (entry.is !== 'better') {
      problems.push(`${label}.byAtLeast is allowed only with "is": "better"`);
    } else if (
      typeof byAtLeast !== 'number' ||
      !(byAtLeast > 0 && byAtLeast < 1)
    ) {
      problems.push(`${label}.byAtLeast must be a fraction between 0 and 1`);
    }
  }
  return {
    scenarios,
    metrics,
    is: entry.is === 'better' ? 'better' : 'notWorse',
    ...(typeof byAtLeast === 'number' ? { byAtLeast } : {}),
  };
}

function selection(
  value: unknown,
  label: string,
  all: readonly string[],
  problems: string[],
  isKnown: (name: unknown) => boolean
): string[] {
  if (value === undefined) {
    return [...all];
  }
  if (!Array.isArray(value) || value.length === 0) {
    problems.push(`${label} must be a list of one or more names`);
    return [];
  }
  const unknown = value.filter((name) => !isKnown(name));
  if (unknown.length > 0) {
    problems.push(
      `${label}: unknown name ${unknown.map((name) => JSON.stringify(name)).join(', ')} (known: ${all.join(', ')})`
    );
  }
  return value.filter(isKnown) as string[];
}

function throwConfigProblems(problems: string[]) {
  throwProblems('The config is not valid', problems);
}
