import fs from 'node:fs';
import path from 'node:path';

import { compareEpochs } from '../crosscheck.mts';
import type { CrosscheckEpoch, FootprintComparison } from '../crosscheck.mts';
import { readEpoch } from '../in-app-sample.mts';
import type { Collector } from '../in-app-sample.mts';
import { BLOCK_ORDER } from '../observer-cost.mts';
import type { ObserverCost } from '../observer-cost.mts';
import { buildValidationRecord } from '../validation-record.mts';
import type { ValidationRecord } from '../validation-record.mts';
import {
  VALIDATION_SOURCE_FORMAT_VERSION,
  readCrosscheckResult,
  readObserverCostResult,
  writeCrosscheckResult,
  writeObserverCostResult,
} from '../validation-sources.mts';
import type {
  CrosscheckResult,
  ObserverCostResult,
  ValidationIdentity,
} from '../validation-sources.mts';
import { inAppSample } from './ios-fixtures.mts';

export type Plan = readonly (readonly [string, Collector])[];

export const STEADY_PLAN: Plan = [
  ['steady', 'full'],
  ['steady', 'endpoints'],
  ['steady', 'endpoints'],
  ['steady', 'full'],
];

export const LOADS_PLAN: Plan = [
  ['idle', 'full'],
  ['ui-stall', 'full'],
  ['js-load', 'full'],
  ['render-heavy', 'full'],
];

const SAMPLE = inAppSample();

export function crosscheckEpochs(
  plan: Plan,
  uiThreadCpu = 350
): CrosscheckEpoch[] {
  const [base] = compareEpochs(
    SAMPLE.epochs,
    [readEpoch(SAMPLE, 0, 60)],
    [
      {
        uiThreadCpu,
        jsThreadCpu: 2,
        processCpu: 353,
        frameDurationsMs: [],
        mountBatchCount: 600,
      },
    ],
    { offsetNs: 0, uncertaintyNs: 0, spreadNs: 0 },
    60
  );
  return plan.map(([load, collector], index) => ({
    ...base,
    index,
    load,
    collector,
    seconds: 2.5,
  }));
}

export function validationSources(
  directory: string,
  identity: ValidationIdentity
) {
  const source = {
    ...identity,
    formatVersion: VALIDATION_SOURCE_FORMAT_VERSION,
    applicationId: 'com.reanimatedbenchmark.a',
    report: { version: 1, load: 80 },
    tools: { node: 'v24', xcode: '27.2', xctrace: '27.2', devicectl: '1' },
  } as const;

  const writeCrosscheck = (
    name: string,
    plan: Plan,
    change: Partial<CrosscheckResult> = {}
  ): string => {
    const folder = path.join(directory, name);
    fs.mkdirSync(folder, { recursive: true });
    const planned = crosscheckEpochs(plan);
    writeCrosscheckResult(folder, {
      ...source,
      scenario:
        plan === LOADS_PLAN ? 'crosscheck-load' : 'worklet-styles-transform',
      plan: {
        epochs: planned.map(({ load, collector, seconds }) => ({
          load,
          collector,
          seconds,
        })),
        start: 'notification',
      },
      tolerances: {
        cpu: { absolute: 1, relative: 0.02 },
        updateDuration: { absolute: 0.25, relative: 0.05 },
        memory: { absolute: 1024, relative: 0.02 },
      },
      thermalState: 0,
      clock: { offsetNs: 0, uncertaintyNs: 0, spreadNs: 0 },
      epochs: planned,
      footprints: Array.from({ length: plan.length + 1 }, (_, i) =>
        footprint(i)
      ),
      verdict: {
        counters: true,
        loadsRan: true,
        memory: 'passed',
        updateDurationQuantilesWithinTolerance: false,
      },
      trace: path.join(folder, 'recording.trace'),
      ...change,
    });
    return folder;
  };

  const writeObserverCost = (
    name: string,
    scenario: string,
    outcome: (metric: ObserverCost['metric']) => ObserverCost['outcome'] = () =>
      'passed',
    blocks = 5
  ): string => {
    const folder = path.join(directory, name);
    fs.mkdirSync(folder, { recursive: true });
    const result: ObserverCostResult = {
      ...source,
      scenario,
      blocks,
      noiseLimitsFile: '/limits.json',
      samples: Array.from({ length: blocks }, (_, i) => i + 1).flatMap(
        (block) =>
          BLOCK_ORDER.map((collector) => ({
            block,
            collector,
            uiThreadCpu: 100,
            jsThreadCpu: 2,
            otherThreadsCpu: 1,
            processCpu: 103,
            memory: 40_000,
            windowSeconds: 10,
          }))
      ),
      costs: (
        ['uiThreadCpu', 'jsThreadCpu', 'processCpu', 'memory'] as const
      ).map((metric) => ({
        metric,
        blocks,
        medianEndpoints: 1,
        medianFull: 1,
        relativeDifference: 0,
        interval: { low: 0, high: 0 },
        noiseLimit: 0.08,
        allowed: 0.02,
        outcome: outcome(metric),
      })),
    };
    writeObserverCostResult(folder, result);
    return folder;
  };

  const record = (
    crosschecks: string[] = [
      writeCrosscheck('steady', STEADY_PLAN),
      writeCrosscheck('loads', LOADS_PLAN),
    ],
    observerCosts: string[] = [
      writeObserverCost('idle', 'idle-cost'),
      writeObserverCost('loaded', 'worklet-styles-transform'),
    ]
  ): ValidationRecord =>
    buildValidationRecord(
      crosschecks.map(readCrosscheckResult),
      observerCosts.map(readObserverCostResult)
    );

  return { writeCrosscheck, writeObserverCost, record };
}

function footprint(boundary: number): FootprintComparison {
  return {
    boundary,
    app: 40_000,
    read: { startNs: 0, endNs: 0 },
    rows: [],
    low: 40_000,
    high: 40_000,
    signedError: 0,
    tolerance: 1024,
    comparable: true,
    reason: null,
    passes: true,
  };
}
