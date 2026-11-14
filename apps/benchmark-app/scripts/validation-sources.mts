import fs from 'node:fs';
import path from 'node:path';

import type {
  ClockMapping,
  ComparedValue,
  CrosscheckEpoch,
  CrosscheckVerdict,
  Tolerance,
} from './crosscheck.mts';
import { ToolError } from './errors.mts';
import type { SamplePlan } from './in-app-sample.mts';
import type { IosToolVersions } from './ios-device.mts';
import type { CollectorSample, ObserverCost } from './observer-cost.mts';
import type { DeviceIdentity } from './platform.mts';
import {
  aBoolean,
  aNumber,
  aString,
  anInteger,
  listOf,
  nullable,
  oneOf,
  shape,
  throwProblems,
} from './validation.mts';
import type { Check } from './validation.mts';

export interface ValidationIdentity {
  platform: 'ios';
  device: DeviceIdentity;
  measurementRevision: number;
  appSources: string;
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
  footprints: ComparedValue[];
  verdict: CrosscheckVerdict;
  trace: string;
}

export interface ObserverCostResult extends ValidationSource {
  blocks: number;
  noiseLimitsFile: string | null;
  samples: CollectorSample[];
  costs: ObserverCost[] | null;
}

export const VALIDATION_SOURCE_FORMAT_VERSION = 1;

export const CROSSCHECK_RESULT_FILE = 'crosscheck.json';

export const OBSERVER_COST_RESULT_FILE = 'observer-cost.json';

const IDENTITY: Record<keyof ValidationIdentity, Check> = {
  platform: oneOf(['ios']),
  device: shape({ model: aString, deviceId: aString, osBuild: aString }),
  measurementRevision: anInteger,
  appSources: aString,
};

const SOURCE: Record<string, Check> = {
  ...IDENTITY,
  formatVersion: oneOf([VALIDATION_SOURCE_FORMAT_VERSION]),
  scenario: aString,
  report: shape({ version: anInteger, load: anInteger }),
};

const PASSES = shape({ passes: aBoolean });

const CROSSCHECK_RESULT: Check = shape({
  ...SOURCE,
  thermalState: anInteger,
  epochs: listOf(
    shape({
      index: anInteger,
      load: aString,
      collector: aString,
      uiThreadCpu: PASSES,
      jsThreadCpu: PASSES,
      processCpu: PASSES,
      mountBatchCount: PASSES,
      workProof: PASSES,
    })
  ),
  footprints: listOf(shape({ passes: aBoolean, trace: nullable(aNumber) })),
  verdict: shape({
    counters: aBoolean,
    loadsRan: aBoolean,
    memory: oneOf(['passed', 'failed', 'not available']),
  }),
});

const OBSERVER_COST_RESULT: Check = shape({
  ...SOURCE,
  blocks: anInteger,
  costs: listOf(
    shape({
      metric: aString,
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

export function readCrosscheckResult(folder: string): CrosscheckResult {
  return readChecked(
    path.join(folder, CROSSCHECK_RESULT_FILE),
    CROSSCHECK_RESULT
  ) as CrosscheckResult;
}

export function readObserverCostResult(folder: string): ObserverCostResult {
  return readChecked(
    path.join(folder, OBSERVER_COST_RESULT_FILE),
    OBSERVER_COST_RESULT
  ) as ObserverCostResult;
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
    appSources: source.appSources,
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
    ['app sources', expected.appSources, actual.appSources],
  ];
  return pairs
    .filter(([, left, right]) => left !== right)
    .map(([name, left, right]) => `${name} ${left} -> ${right}`);
}

function writeJson(file: string, value: unknown) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readChecked(file: string, check: Check): unknown {
  let stored: unknown;
  try {
    stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ToolError(`Cannot read ${file}: ${(error as Error).message}`);
  }
  const problems: string[] = [];
  check(stored, path.basename(file, '.json'), problems);
  throwProblems(`${file} is not a complete validation result`, problems);
  return stored;
}
