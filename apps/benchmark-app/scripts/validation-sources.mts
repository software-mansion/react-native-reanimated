import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import {
  CROSSCHECK_TOLERANCES,
  clockProblems,
  crosscheckVerdict,
  rederivedEpoch,
  rederivedFootprint,
} from './crosscheck.mts';
import type {
  BoundaryClocks,
  ClockMapping,
  CrosscheckEpoch,
  CrosscheckTolerances,
  CrosscheckVerdict,
  FootprintComparison,
} from './crosscheck.mts';
import { ToolError } from './errors.mts';
import {
  IN_APP_BOUNDARY,
  footprintReadSpan,
  readEpochCounters,
  readOrderProblems,
} from './in-app-sample.mts';
import type { InAppBoundary, SamplePlan } from './in-app-sample.mts';
import { IOS_DEFINITION } from './ios-definition.mts';
import type { IosToolVersions } from './ios-device.mts';
import {
  BLOCK_ORDER,
  MINIMUM_BLOCKS,
  OBSERVER_COST_METRICS,
  observerCosts,
} from './observer-cost.mts';
import type { CollectorSample, ObserverCost } from './observer-cost.mts';
import type { DeviceIdentity } from './platform.mts';
import {
  aBoolean,
  aNumber,
  aPositiveNumber,
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
  refreshRate: number;
  tolerances: CrosscheckTolerances;
  thermalState: number;
  cpuCount: number;
  appBoundaries: InAppBoundary[];
  boundaryClocks: BoundaryClocks;
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

export interface EarlierValue {
  app: number | null;
  trace: number | null;
  signedError: number | null;
  relativeError: number | null;
  tolerance: number | null;
  passes: boolean;
}

export interface EarlierCrosscheck {
  measurementRevision: number;
  scenario: string;
  epochs: {
    index: number;
    load: string;
    collector: string;
    uiThreadCpu: EarlierValue;
    jsThreadCpu: EarlierValue;
    processCpu: EarlierValue;
  }[];
  verdict: { counters: boolean; loadsRan: boolean };
}

export interface StoredSource<R> {
  folder: string;
  sha256: string;
  result: R;
}

export const VALIDATION_SOURCE_FORMAT_VERSION = 4;

export const CROSSCHECK_RESULT_FILE = 'crosscheck.json';

export const OBSERVER_COST_RESULT_FILE = 'observer-cost.json';

const NUMBER_OR_NULL = nullable(aNumber);

const SOURCE: Record<string, Check> = {
  formatVersion: oneOf([VALIDATION_SOURCE_FORMAT_VERSION]),
  platform: oneOf(['ios']),
  device: shape({ model: aString, deviceId: aString, osBuild: aString }),
  measurementRevision: anInteger,
  appBuild: aString,
  scenario: aString,
  report: shape({ version: anInteger, load: anInteger }),
};

const TOLERANCE = shape({ absolute: aNumber, relative: aNumber });

const TIME_SPAN = shape({ startNs: aNumber, endNs: aNumber });

const COMPARED_VALUE = shape({
  app: NUMBER_OR_NULL,
  trace: NUMBER_OR_NULL,
  signedError: NUMBER_OR_NULL,
  absoluteError: NUMBER_OR_NULL,
  relativeError: NUMBER_OR_NULL,
  timingUncertainty: NUMBER_OR_NULL,
  tolerance: NUMBER_OR_NULL,
  passes: aBoolean,
});

const ON_CORE = shape({ running: aNumber, interrupted: aNumber });

const PLANNED_EPOCH: Record<string, Check> = {
  load: aString,
  collector: oneOf(['full', 'endpoints']),
  seconds: aPositiveNumber,
};

const CROSSCHECK_SHAPE: Check = shape({
  ...SOURCE,
  plan: shape({
    epochs: listOf(shape(PLANNED_EPOCH)),
    start: oneOf(['ready', 'notification']),
  }),
  refreshRate: aPositiveNumber,
  tolerances: shape({
    cpu: TOLERANCE,
    updateDuration: TOLERANCE,
    memory: TOLERANCE,
  }),
  thermalState: anInteger,
  cpuCount: aPositiveNumber,
  appBoundaries: listOf(IN_APP_BOUNDARY),
  boundaryClocks: shape({
    unit: oneOf(['ns']),
    boundaries: listOf(
      shape({
        id: anInteger,
        appSignpostStartNs: aNumber,
        appSignpostEndNs: aNumber,
        traceNs: aNumber,
        offsetNs: aNumber,
      })
    ),
  }),
  clock: shape({
    offsetNs: aNumber,
    uncertaintyNs: aNumber,
    spreadNs: aNumber,
  }),
  epochs: listOf(
    shape({
      ...PLANNED_EPOCH,
      work: shape({ own: anInteger, other: anInteger }),
      index: anInteger,
      windowSeconds: aPositiveNumber,
      traceOnCore: shape({
        uiThreadCpu: ON_CORE,
        jsThreadCpu: ON_CORE,
        processCpu: ON_CORE,
      }),
      uiThreadCpu: COMPARED_VALUE,
      jsThreadCpu: COMPARED_VALUE,
      processCpu: COMPARED_VALUE,
      mountBatchCount: COMPARED_VALUE,
      workProof: shape({
        own: anInteger,
        other: anInteger,
        minimumOwn: aNumber,
        maximumOther: aNumber,
        passes: aBoolean,
      }),
      updateCount: shape({ app: nullable(anInteger), trace: anInteger }),
      uiUpdateDurationMedian: nullable(COMPARED_VALUE),
      uiUpdateDurationP95: nullable(COMPARED_VALUE),
    })
  ),
  footprints: listOf(
    shape({
      boundary: anInteger,
      app: aNumber,
      read: TIME_SPAN,
      rows: listOf(
        shape({ startNs: aNumber, endNs: aNumber, footprintKb: aNumber })
      ),
      low: NUMBER_OR_NULL,
      high: NUMBER_OR_NULL,
      signedError: NUMBER_OR_NULL,
      tolerance: NUMBER_OR_NULL,
      comparable: aBoolean,
      reason: nullable(aString),
      passes: aBoolean,
    })
  ),
  verdict: shape({
    counters: aBoolean,
    loadsRan: aBoolean,
    memory: oneOf(['passed', 'failed', 'not available']),
    updateDurationQuantilesWithinTolerance: aBoolean,
  }),
  trace: aString,
});

const OBSERVER_COST_SHAPE: Check = shape({
  ...SOURCE,
  blocks: anInteger,
  samples: listOf(
    shape({
      block: anInteger,
      collector: oneOf(['full', 'endpoints']),
      uiThreadCpu: aNumber,
      jsThreadCpu: aNumber,
      otherThreadsCpu: aNumber,
      processCpu: aNumber,
      memory: aNumber,
      windowSeconds: aNumber,
    })
  ),
  costs: listOf(
    shape({
      metric: oneOf(OBSERVER_COST_METRICS),
      blocks: anInteger,
      medianEndpoints: aNumber,
      medianFull: aNumber,
      relativeDifference: NUMBER_OR_NULL,
      interval: nullable(shape({ low: aNumber, high: aNumber })),
      noiseLimit: NUMBER_OR_NULL,
      allowed: NUMBER_OR_NULL,
      outcome: oneOf(['passed', 'failed', 'not validated']),
    })
  ),
});

const DERIVED_EPOCH_FIELDS = [
  'windowSeconds',
  'uiThreadCpu',
  'jsThreadCpu',
  'processCpu',
  'mountBatchCount',
  'workProof',
  'uiUpdateDurationMedian',
  'uiUpdateDurationP95',
] as const;

const CROSSCHECK_RESULT = completeResult(
  CROSSCHECK_SHAPE,
  crosscheckGaps,
  crosscheckConflicts
);

const OBSERVER_COST_RESULT = completeResult(
  OBSERVER_COST_SHAPE,
  observerCostGaps,
  observerCostConflicts
);

const EARLIER_VALUE = shape({
  app: NUMBER_OR_NULL,
  trace: NUMBER_OR_NULL,
  signedError: NUMBER_OR_NULL,
  relativeError: NUMBER_OR_NULL,
  tolerance: NUMBER_OR_NULL,
  passes: aBoolean,
});

const EARLIER_CROSSCHECK = completeResult<EarlierCrosscheck>(
  shape({
    measurementRevision: anInteger,
    scenario: aString,
    epochs: listOf(
      shape({
        index: anInteger,
        load: aString,
        collector: aString,
        uiThreadCpu: EARLIER_VALUE,
        jsThreadCpu: EARLIER_VALUE,
        processCpu: EARLIER_VALUE,
      })
    ),
    verdict: shape({ counters: aBoolean, loadsRan: aBoolean }),
  }),
  (result) =>
    result.measurementRevision < IOS_DEFINITION.measurementRevision
      ? []
      : [
          `it is of the measurement revision ${result.measurementRevision}, not of an earlier revision than ${IOS_DEFINITION.measurementRevision}`,
        ],
  () => []
);

export const STORED_CROSSCHECK = storedSource(CROSSCHECK_RESULT);

export const STORED_EARLIER_CROSSCHECK = storedSource(EARLIER_CROSSCHECK);

export const STORED_OBSERVER_COST = storedSource(OBSERVER_COST_RESULT);

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
  return readSource(folder, CROSSCHECK_RESULT_FILE, CROSSCHECK_RESULT);
}

export function readObserverCostResult(
  folder: string
): StoredSource<ObserverCostResult> {
  return readSource(folder, OBSERVER_COST_RESULT_FILE, OBSERVER_COST_RESULT);
}

export function readEarlierCrosscheck(
  folder: string
): StoredSource<EarlierCrosscheck> {
  const source = readSource<EarlierCrosscheck>(
    folder,
    CROSSCHECK_RESULT_FILE,
    EARLIER_CROSSCHECK
  );
  const { measurementRevision, scenario, epochs, verdict } = source.result;
  const result = {
    measurementRevision,
    scenario,
    epochs: epochs.map((epoch) => ({
      index: epoch.index,
      load: epoch.load,
      collector: epoch.collector,
      uiThreadCpu: earlierValue(epoch.uiThreadCpu),
      jsThreadCpu: earlierValue(epoch.jsThreadCpu),
      processCpu: earlierValue(epoch.processCpu),
    })),
    verdict: { counters: verdict.counters, loadsRan: verdict.loadsRan },
  };
  return { folder: source.folder, sha256: resultHash(result), result };
}

export function rederivedEpochs(result: CrosscheckResult): CrosscheckEpoch[] {
  return result.epochs.map((epoch, i) =>
    rederivedEpoch(epoch, {
      refreshRate: result.refreshRate,
      counters: readEpochCounters(
        result.appBoundaries[i],
        result.appBoundaries[i + 1],
        result.cpuCount,
        i
      ),
      clock: result.clock,
    })
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

function completeResult<R>(
  shapeCheck: Check,
  gapsOf: (result: R) => string[],
  conflictsOf: (result: R) => string[]
): Check {
  return (value, label, problems) => {
    const shapeProblems: string[] = [];
    shapeCheck(value, label, shapeProblems);
    problems.push(...shapeProblems);
    if (shapeProblems.length > 0) {
      return;
    }
    const gaps = gapsOf(value as R);
    problems.push(
      ...(gaps.length > 0 ? gaps : conflictsOf(value as R)).map(
        (problem) => `${label}: ${problem}`
      )
    );
  };
}

function storedSource(resultCheck: Check): Check {
  const sourceShape = shape({
    folder: aString,
    sha256: aString,
    result: resultCheck,
  });
  return (value, label, problems) => {
    const sourceProblems: string[] = [];
    sourceShape(value, label, sourceProblems);
    problems.push(...sourceProblems);
    const source = value as StoredSource<unknown>;
    if (
      sourceProblems.length === 0 &&
      source.sha256 !== resultHash(source.result)
    ) {
      problems.push(`${label}.sha256 is not the SHA-256 of its result`);
    }
  };
}

function readSource<R>(
  folder: string,
  fileName: string,
  check: Check
): StoredSource<R> {
  const file = path.join(folder, fileName);
  let stored: unknown;
  try {
    stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ToolError(`Cannot read ${file}: ${(error as Error).message}`);
  }
  const problems: string[] = [];
  check(stored, path.basename(file, '.json'), problems);
  throwProblems(`${file} is not a complete validation result`, problems);
  return {
    folder: fs.realpathSync(folder),
    sha256: resultHash(stored),
    result: stored as R,
  };
}

function earlierValue(value: EarlierValue): EarlierValue {
  return {
    app: value.app,
    trace: value.trace,
    signedError: value.signedError,
    relativeError: value.relativeError,
    tolerance: value.tolerance,
    passes: value.passes,
  };
}

function resultHash(result: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(result))
    .digest('hex');
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
  for (const [name, count] of [
    ['footprint comparisons', result.footprints.length],
    ['app boundaries', result.appBoundaries.length],
    ['boundary clocks', result.boundaryClocks.boundaries.length],
  ] as const) {
    if (count !== planned.length + 1) {
      problems.push(
        `it has ${count} ${name} for ${planned.length + 1} boundaries`
      );
    }
  }
  return problems;
}

function crosscheckConflicts(result: CrosscheckResult): string[] {
  const problems: string[] = [
    ...readOrderProblems(result.appBoundaries),
    ...clockProblems(result.boundaryClocks, result.clock),
    ...boundaryTimeProblems(result),
  ];
  if (!isDeepStrictEqual(result.tolerances, CROSSCHECK_TOLERANCES)) {
    problems.push('its tolerances are not the tolerances of this driver');
  }
  let epochs: CrosscheckEpoch[];
  try {
    epochs = rederivedEpochs(result);
  } catch (error) {
    return [...problems, (error as Error).message];
  }
  epochs.forEach((epoch, i) => {
    for (const field of DERIVED_EPOCH_FIELDS) {
      if (!isDeepStrictEqual(epoch[field], result.epochs[i][field])) {
        problems.push(
          `epoch ${i}: the stored ${field} does not follow from its values`
        );
      }
    }
  });
  const footprints = result.footprints.map(rederivedFootprint);
  footprints.forEach((footprint, i) => {
    if (!isDeepStrictEqual(footprint, result.footprints[i])) {
      problems.push(
        `footprint ${i}: the stored comparison does not follow from its read and its rows`
      );
    }
  });
  const verdict = crosscheckVerdict(epochs, footprints);
  for (const key of Object.keys(verdict) as (keyof CrosscheckVerdict)[]) {
    if (verdict[key] !== result.verdict[key]) {
      problems.push(
        `verdict.${key} is ${result.verdict[key]}, but the epochs and the footprints give ${verdict[key]}`
      );
    }
  }
  return problems;
}

function boundaryTimeProblems(result: CrosscheckResult): string[] {
  const { offsetNs, uncertaintyNs } = result.clock;
  return result.appBoundaries.flatMap((boundary, i) => {
    const clock = result.boundaryClocks.boundaries[i];
    const footprint = result.footprints[i];
    const read = footprintReadSpan(boundary);
    return [
      ...(clock.appSignpostStartNs === boundary.signpostStartNs &&
      clock.appSignpostEndNs === boundary.signpostEndNs
        ? []
        : [
            `boundary ${i}: the signpost times of the clock are not the signpost times of the app boundary`,
          ]),
      ...(footprint.app === boundary.footprintKb &&
      footprint.read.startNs === read.startNs + offsetNs - uncertaintyNs &&
      footprint.read.endNs === read.endNs + offsetNs + uncertaintyNs
        ? []
        : [
            `footprint ${i}: the app value or the read does not follow from the app boundary and the clock mapping`,
          ]),
    ];
  });
}

function observerCostGaps(result: ObserverCostResult): string[] {
  const blocks = completeBlocks(result.samples);
  const problems: string[] = [];
  if (
    blocks < MINIMUM_BLOCKS ||
    blocks !== result.blocks ||
    result.samples.length !== blocks * BLOCK_ORDER.length
  ) {
    problems.push(
      `it has ${blocks} complete blocks in ${result.samples.length} samples for ${result.blocks} planned blocks, and it needs at least ${MINIMUM_BLOCKS}`
    );
  }
  const metrics = (result.costs ?? []).map((cost) => cost.metric);
  if (!isDeepStrictEqual(metrics, [...OBSERVER_COST_METRICS])) {
    problems.push(
      `it has costs for ${metrics.join(', ') || 'no metric'}, not for ${OBSERVER_COST_METRICS.join(', ')} in this order`
    );
  }
  return problems;
}

function observerCostConflicts(result: ObserverCostResult): string[] {
  const costs = result.costs ?? [];
  const limits = Object.fromEntries(
    costs.flatMap((cost) =>
      cost.noiseLimit === null ? [] : [[cost.metric, cost.noiseLimit]]
    )
  );
  return observerCosts(result.samples, limits).flatMap((cost, i) =>
    isDeepStrictEqual(cost, costs[i])
      ? []
      : [
          `the stored cost of ${cost.metric} does not follow from the samples and its noise limit`,
        ]
  );
}

function writeJson(file: string, value: unknown) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
