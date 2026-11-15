import fs from 'node:fs';
import path from 'node:path';

import {
  CROSSCHECK_TOLERANCES,
  WORK_LOADS,
  boundaryClocks,
  crosscheckVerdict,
  deriveCrosscheck,
} from '../crosscheck.mts';
import type {
  CrosscheckDerivation,
  CrosscheckEpoch,
  EpochEvidence,
  FootprintComparison,
} from '../crosscheck.mts';
import type {
  Collector,
  InAppBoundary,
  SampledEpoch,
} from '../in-app-sample.mts';
import {
  KNOWN_WORK_INSTRUCTIONS_PER_UNIT,
  KNOWN_WORK_PLAN,
  KNOWN_WORK_TOLERANCE,
  KNOWN_WORK_UNITS,
  deriveKnownWork,
} from '../known-work.mts';
import {
  BLOCK_ORDER,
  OBSERVER_COST_METRICS,
  observerCosts,
} from '../observer-cost.mts';
import type { ObserverCost, ObserverCostMetric } from '../observer-cost.mts';
import { buildValidationRecord } from '../validation-record.mts';
import type { ValidationRecord } from '../validation-record.mts';
import {
  VALIDATION_SOURCE_FORMAT_VERSION,
  readCrosscheckResult,
  readKnownWorkResult,
  readObserverCostResult,
  writeCrosscheckResult,
  writeKnownWorkResult,
  writeObserverCostResult,
} from '../validation-sources.mts';
import type {
  CrosscheckResult,
  KnownWorkResult,
  ObserverCostResult,
  ValidationIdentity,
} from '../validation-sources.mts';
import type { FootprintSample } from '../xctrace-metrics.mts';
import { START_BOUNDARY } from './ios-fixtures.mts';

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

export const REFRESH_RATE = 60;

const EPOCH_SECONDS = 2.5;

const BOUNDARY_SPACING_NS = EPOCH_SECONDS * 1e9;

const CPU_COUNT = 6;

const MOUNTS_PER_EPOCH = 150;

const ZERO_CLOCK = { offsetNs: 0, uncertaintyNs: 0, spreadNs: 0 };

const IDLE_INSTRUCTIONS_PER_SECOND = 50_000_000;

const KNOWN_WORK_UNITS_OF: Record<string, number> = {
  'known-work': KNOWN_WORK_UNITS,
  'known-work-double': 2 * KNOWN_WORK_UNITS,
  'known-work-background': KNOWN_WORK_UNITS,
  'known-work-ended': KNOWN_WORK_UNITS,
};

export function crosscheckEpochs(
  plan: Plan,
  traceUiThreadCpu = 350
): CrosscheckEpoch[] {
  return derivation(
    appBoundaries(plan.length + 1),
    plan.map(([load, collector]) =>
      epochEvidence(load, collector, traceUiThreadCpu)
    ),
    () => null
  ).epochs;
}

export function appBoundaries(count: number): InAppBoundary[] {
  return Array.from({ length: count }, (_, boundary) => {
    const at = (ns: number) => boundary * BOUNDARY_SPACING_NS + ns;
    return {
      ...START_BOUNDARY,
      uiReadStartNs: at(100),
      uiReadEndNs: at(150),
      uiThreadCpuUs: 1_000_000 + boundary * 875_000,
      jsReadStartNs: at(200),
      jsReadEndNs: at(250),
      jsThreadCpuUs: 500_000 + boundary * 5_000,
      processReadStartNs: at(300),
      processReadEndNs: at(350),
      processCpuUs: 2_000_000 + boundary * 882_500,
      instructionReadStartNs: at(400),
      instructionReadEndNs: at(450),
      footprintReadStartNs: at(500),
      footprintReadEndNs: at(600),
      signpostStartNs: at(700),
      signpostEndNs: at(700),
      footprintKb: 40_000,
      mounts: 10 + boundary * MOUNTS_PER_EPOCH,
    };
  });
}

export function footprints(
  boundaries: number,
  rowsAt: (boundary: number) => [number, number] | null = () => [40_000, 40_000]
): FootprintComparison[] {
  return derivation(appBoundaries(boundaries), [], rowsAt).footprints;
}

function derivation(
  boundaries: InAppBoundary[],
  epochs: EpochEvidence[],
  rowsAt: (boundary: number) => [number, number] | null
): CrosscheckDerivation {
  return deriveCrosscheck({
    refreshRate: REFRESH_RATE,
    cpuCount: CPU_COUNT,
    reportedThermalState: 0,
    appBoundaries: boundaries,
    clock: ZERO_CLOCK,
    epochs,
    footprintRows: boundaries.map((_, boundary) =>
      footprintRows(boundary, rowsAt(boundary))
    ),
  });
}

function epochEvidence(
  load: string,
  collector: Collector,
  traceUiThreadCpu: number
): EpochEvidence {
  return {
    load,
    collector,
    seconds: EPOCH_SECONDS,
    work: {
      own: (WORK_LOADS as readonly string[]).includes(load)
        ? REFRESH_RATE * EPOCH_SECONDS
        : 0,
      other: 0,
    },
    traceOnCore: {
      uiThreadCpu: { running: traceUiThreadCpu - 5, interrupted: 5 },
      jsThreadCpu: { running: 2, interrupted: 0 },
      processCpu: { running: 348, interrupted: 5 },
    },
    traceMountBatchCount: MOUNTS_PER_EPOCH,
    updateCount: { app: null, trace: 0 },
    uiUpdateDurationMedian: null,
    uiUpdateDurationP95: null,
  };
}

export function knownWorkEpochs(): SampledEpoch[] {
  return KNOWN_WORK_PLAN.epochs.map((epoch) => ({
    ...epoch,
    work: { own: KNOWN_WORK_UNITS_OF[epoch.load] ?? 0, other: 0 },
  }));
}

export function knownWorkBoundaries(
  extraInstructions: (load: string) => number = () => 0
): InAppBoundary[] {
  const starts = [0];
  for (const epoch of KNOWN_WORK_PLAN.epochs) {
    starts.push((starts.at(-1) ?? 0) + epoch.seconds * 1e9);
  }
  let instructions = 10_000_000_000;
  return starts.map((startNs, boundary) => {
    const previous = KNOWN_WORK_PLAN.epochs[boundary - 1];
    if (previous) {
      instructions +=
        IDLE_INSTRUCTIONS_PER_SECOND * previous.seconds +
        (KNOWN_WORK_UNITS_OF[previous.load] ?? 0) *
          KNOWN_WORK_INSTRUCTIONS_PER_UNIT +
        extraInstructions(previous.load);
    }
    const at = (ns: number) => startNs + ns;
    const seconds = startNs / 1e9;
    return {
      ...START_BOUNDARY,
      uiReadStartNs: at(100),
      uiReadEndNs: at(150),
      uiThreadCpuUs: 1_000_000 + Math.round(seconds * 100_000),
      jsReadStartNs: at(200),
      jsReadEndNs: at(250),
      jsThreadCpuUs: 500_000 + Math.round(seconds * 2_000),
      processReadStartNs: at(300),
      processReadEndNs: at(350),
      processCpuUs: 2_000_000 + Math.round(seconds * 600_000),
      processPerformanceCpuUs: 1_200_000,
      instructionReadStartNs: at(400),
      instructionReadEndNs: at(450),
      processInstructions: instructions,
      processCycles: 5_000_000_000 + Math.round(seconds * 1_000_000_000),
      footprintReadStartNs: at(500),
      footprintReadEndNs: at(600),
      signpostStartNs: at(700),
      signpostEndNs: at(700),
      mounts: 10,
      updates: 0,
    };
  });
}

function footprintRows(
  boundary: number,
  values: [number, number] | null
): FootprintSample[] {
  const startNs = boundary * BOUNDARY_SPACING_NS;
  return values === null
    ? []
    : [
        { startNs, endNs: startNs + 100, footprintKb: values[0] },
        {
          startNs: startNs + 1_000,
          endNs: startNs + 1_100,
          footprintKb: values[1],
        },
      ];
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
    const planned = change.epochs ?? crosscheckEpochs(plan);
    const boundaries = appBoundaries(plan.length + 1);
    const compared = change.footprints ?? footprints(plan.length + 1);
    writeCrosscheckResult(folder, {
      ...source,
      scenario:
        plan === LOADS_PLAN ? 'crosscheck-load' : 'worklet-styles-transform',
      plan: {
        epochs: plan.map(([load, collector]) => ({
          load,
          collector,
          seconds: EPOCH_SECONDS,
        })),
        start: 'notification',
      },
      refreshRate: REFRESH_RATE,
      tolerances: CROSSCHECK_TOLERANCES,
      thermalState: 0,
      cpuCount: CPU_COUNT,
      appBoundaries: boundaries,
      boundaryClocks: boundaryClocks(
        boundaries,
        boundaries.map((boundary) => boundary.signpostStartNs)
      ),
      clock: ZERO_CLOCK,
      epochs: planned,
      footprints: compared,
      verdict: crosscheckVerdict(planned, compared),
      trace: path.join(folder, 'recording.trace'),
      ...change,
    });
    return folder;
  };

  const writeKnownWork = (
    name: string,
    extraInstructions?: (load: string) => number,
    change: Partial<KnownWorkResult> = {}
  ): string => {
    const folder = path.join(directory, name);
    fs.mkdirSync(folder, { recursive: true });
    const evidence = {
      cpuCount: CPU_COUNT,
      reportedThermalState: change.reportedThermalState ?? 0,
      appBoundaries: knownWorkBoundaries(extraInstructions),
      epochs: knownWorkEpochs(),
    };
    writeKnownWorkResult(folder, {
      ...source,
      scenario: 'crosscheck-load',
      plan: KNOWN_WORK_PLAN,
      cpuCount: evidence.cpuCount,
      reportedThermalState: evidence.reportedThermalState,
      appBoundaries: evidence.appBoundaries,
      sampledEpochs: evidence.epochs,
      instructionsPerUnit: KNOWN_WORK_INSTRUCTIONS_PER_UNIT,
      tolerance: KNOWN_WORK_TOLERANCE,
      ...deriveKnownWork(evidence),
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
    const value = (
      metric: ObserverCostMetric,
      base: number,
      collector: Collector
    ) =>
      collector === 'full' && outcome(metric) === 'failed' ? base * 1.03 : base;
    const samples = Array.from({ length: blocks }, (_, i) => i + 1).flatMap(
      (block) =>
        BLOCK_ORDER.map((collector) => ({
          block,
          collector,
          processInstructionRate: value(
            'processInstructionRate',
            0.42,
            collector
          ),
          uiThreadCpu: value('uiThreadCpu', 100, collector),
          jsThreadCpu: value('jsThreadCpu', 2, collector),
          otherThreadsCpu: 1,
          processCpu: value('processCpu', 103, collector),
          memory: value('memory', 40_000, collector),
          windowSeconds: 10,
        }))
    );
    const noiseLimits = Object.fromEntries(
      OBSERVER_COST_METRICS.flatMap((metric) =>
        outcome(metric) === 'not validated' ? [] : [[metric, 0.08]]
      )
    );
    const result: ObserverCostResult = {
      ...source,
      scenario,
      blocks,
      noiseLimitsFile: '/limits.json',
      samples,
      costs: blocks === 0 ? [] : observerCosts(samples, noiseLimits),
    };
    writeObserverCostResult(folder, result);
    return folder;
  };

  const record = (
    knownWorks: string[] = [writeKnownWork('known-work')],
    observerCosts: string[] = [
      writeObserverCost('idle', 'idle-cost'),
      writeObserverCost('loaded', 'worklet-styles-transform'),
    ],
    crosschecks: string[] = []
  ): ValidationRecord =>
    buildValidationRecord({
      knownWorks: knownWorks.map(readKnownWorkResult),
      observerCosts: observerCosts.map(readObserverCostResult),
      crosschecks: crosschecks.map(readCrosscheckResult),
    });

  return { writeCrosscheck, writeKnownWork, writeObserverCost, record };
}
