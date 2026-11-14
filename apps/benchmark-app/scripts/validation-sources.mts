import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type {
  ClockMapping,
  CrosscheckEpoch,
  CrosscheckVerdict,
  FootprintComparison,
  Tolerance,
} from './crosscheck.mts';
import { ToolError } from './errors.mts';
import type { SamplePlan } from './in-app-sample.mts';
import type { IosToolVersions } from './ios-device.mts';
import {
  BLOCK_ORDER,
  MINIMUM_BLOCKS,
  OBSERVER_COST_METRICS,
} from './observer-cost.mts';
import type { CollectorSample, ObserverCost } from './observer-cost.mts';
import type { DeviceIdentity } from './platform.mts';
import {
  aBoolean,
  aNumber,
  aString,
  anInteger,
  listOf,
  oneOf,
  shape,
  throwProblems,
} from './validation.mts';
import type { Check } from './validation.mts';

export interface ValidationIdentity {
  platform: 'ios';
  device: DeviceIdentity;
  measurementRevision: number;
  appBuild: string;
}

interface ValidationSource extends ValidationIdentity {
  formatVersion: typeof VALIDATION_SOURCE_FORMAT_VERSION;
  applicationId: string;
  scenario: string;
  report: { version: number; load: number };
  tools: IosToolVersions;
}

export interface CrosscheckResult extends ValidationSource {
  plan: SamplePlan;
  tolerances: Record<'cpu' | 'updateDuration' | 'memory', Tolerance>;
  thermalState: number;
  clock: ClockMapping;
  epochs: CrosscheckEpoch[];
  footprints: FootprintComparison[];
  verdict: CrosscheckVerdict;
  trace: string;
}

export interface ObserverCostResult extends ValidationSource {
  blocks: number;
  noiseLimitsFile: string | null;
  samples: CollectorSample[];
  costs: ObserverCost[] | null;
}

export interface StoredSource<R> {
  folder: string;
  sha256: string;
  result: R;
}

export const VALIDATION_SOURCE_FORMAT_VERSION = 2;

export const CROSSCHECK_RESULT_FILE = 'crosscheck.json';

export const OBSERVER_COST_RESULT_FILE = 'observer-cost.json';

const IDENTITY: Record<keyof ValidationIdentity, Check> = {
  platform: oneOf(['ios']),
  device: shape({ model: aString, deviceId: aString, osBuild: aString }),
  measurementRevision: anInteger,
  appBuild: aString,
};

const SOURCE: Record<string, Check> = {
  ...IDENTITY,
  formatVersion: oneOf([VALIDATION_SOURCE_FORMAT_VERSION]),
  scenario: aString,
  report: shape({ version: anInteger, load: anInteger }),
};

const PASSES = shape({ passes: aBoolean });

const PLANNED_EPOCH: Record<string, Check> = {
  load: aString,
  collector: oneOf(['full', 'endpoints']),
  seconds: aNumber,
};

const CROSSCHECK_RESULT: Check = shape({
  ...SOURCE,
  plan: shape({ epochs: listOf(shape(PLANNED_EPOCH)) }),
  thermalState: anInteger,
  epochs: listOf(
    shape({
      ...PLANNED_EPOCH,
      index: anInteger,
      uiThreadCpu: PASSES,
      jsThreadCpu: PASSES,
      processCpu: PASSES,
      mountBatchCount: PASSES,
      workProof: PASSES,
    })
  ),
  footprints: listOf(shape({ comparable: aBoolean, passes: aBoolean })),
  verdict: shape({
    counters: aBoolean,
    loadsRan: aBoolean,
    memory: oneOf(['passed', 'failed', 'not available']),
  }),
  trace: aString,
});

const OBSERVER_COST_RESULT: Check = shape({
  ...SOURCE,
  blocks: anInteger,
  samples: listOf(
    shape({ block: anInteger, collector: oneOf(['full', 'endpoints']) })
  ),
  costs: listOf(
    shape({
      metric: oneOf(OBSERVER_COST_METRICS),
      blocks: anInteger,
      outcome: oneOf(['passed', 'failed', 'not validated']),
    })
  ),
});

export function writeCrosscheckResult(
  folder: string,
  result: CrosscheckResult
) {
  writeJson(path.join(folder, CROSSCHECK_RESULT_FILE), result);
}

export function writeObserverCostResult(
  folder: string,
  result: ObserverCostResult
) {
  writeJson(path.join(folder, OBSERVER_COST_RESULT_FILE), result);
}

export function readCrosscheckResult(
  folder: string
): StoredSource<CrosscheckResult> {
  return readSource(
    folder,
    CROSSCHECK_RESULT_FILE,
    CROSSCHECK_RESULT,
    crosscheckGaps
  );
}

export function readObserverCostResult(
  folder: string
): StoredSource<ObserverCostResult> {
  return readSource(
    folder,
    OBSERVER_COST_RESULT_FILE,
    OBSERVER_COST_RESULT,
    observerCostGaps
  );
}

export function completeBlocks(samples: readonly CollectorSample[]): number {
  const blocks = new Map<number, string[]>();
  for (const sample of samples) {
    blocks.set(sample.block, [
      ...(blocks.get(sample.block) ?? []),
      sample.collector,
    ]);
  }
  return [...blocks.values()].filter(
    (collectors) => collectors.join() === BLOCK_ORDER.join()
  ).length;
}

export function identityOf(source: ValidationIdentity): ValidationIdentity {
  return {
    platform: source.platform,
    device: {
      model: source.device.model,
      deviceId: source.device.deviceId,
      osBuild: source.device.osBuild,
    },
    measurementRevision: source.measurementRevision,
    appBuild: source.appBuild,
  };
}

export function identityDifferences(
  expected: ValidationIdentity,
  actual: ValidationIdentity
): string[] {
  const pairs: [string, string | number, string | number][] = [
    ['platform', expected.platform, actual.platform],
    ['device model', expected.device.model, actual.device.model],
    ['device', expected.device.deviceId, actual.device.deviceId],
    ['OS build', expected.device.osBuild, actual.device.osBuild],
    [
      'measurement revision',
      expected.measurementRevision,
      actual.measurementRevision,
    ],
    ['app build', expected.appBuild, actual.appBuild],
  ];
  return pairs
    .filter(([, left, right]) => left !== right)
    .map(([name, left, right]) => `${name} ${left} -> ${right}`);
}

function readSource<R>(
  folder: string,
  fileName: string,
  check: Check,
  gapsOf: (result: R) => string[]
): StoredSource<R> {
  const file = path.join(folder, fileName);
  let bytes: Buffer;
  let stored: unknown;
  try {
    bytes = fs.readFileSync(file);
    stored = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new ToolError(`Cannot read ${file}: ${(error as Error).message}`);
  }
  const title = `${file} is not a complete validation result`;
  const problems: string[] = [];
  check(stored, path.basename(file, '.json'), problems);
  throwProblems(title, problems);
  throwProblems(title, gapsOf(stored as R));
  return {
    folder: fs.realpathSync(folder),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    result: stored as R,
  };
}

function crosscheckGaps(result: CrosscheckResult): string[] {
  const planned = result.plan.epochs;
  const problems: string[] = [];
  if (planned.length === 0) {
    problems.push('the plan has no epoch');
  }
  if (result.epochs.length !== planned.length) {
    problems.push(
      `it has ${result.epochs.length} epoch results for ${planned.length} planned epochs`
    );
  }
  result.epochs.forEach((epoch, i) => {
    const plan = planned.at(i);
    if (
      epoch.index !== i ||
      plan === undefined ||
      epoch.load !== plan.load ||
      epoch.collector !== plan.collector ||
      epoch.seconds !== plan.seconds
    ) {
      problems.push(`epoch result ${i} is not the planned epoch ${i}`);
    }
  });
  if (result.footprints.length !== planned.length + 1) {
    problems.push(
      `it has ${result.footprints.length} footprint comparisons for ${planned.length + 1} boundaries`
    );
  }
  return problems;
}

function observerCostGaps(result: ObserverCostResult): string[] {
  const blocks = completeBlocks(result.samples);
  const problems: string[] = [];
  if (blocks < MINIMUM_BLOCKS || blocks !== result.blocks) {
    problems.push(
      `it has ${blocks} complete blocks of ${result.blocks} planned blocks, and it needs at least ${MINIMUM_BLOCKS}`
    );
  }
  const metrics = (result.costs ?? []).map((cost) => cost.metric);
  if (
    metrics.length !== OBSERVER_COST_METRICS.length ||
    OBSERVER_COST_METRICS.some((metric) => !metrics.includes(metric))
  ) {
    problems.push(
      `it has costs for ${metrics.join(', ') || 'no metric'}, not one cost for each of ${OBSERVER_COST_METRICS.join(', ')}`
    );
  }
  for (const cost of result.costs ?? []) {
    if (cost.blocks !== blocks) {
      problems.push(
        `the cost of ${cost.metric} uses ${cost.blocks} blocks, not the ${blocks} complete blocks`
      );
    }
  }
  return problems;
}

function writeJson(file: string, value: unknown) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
