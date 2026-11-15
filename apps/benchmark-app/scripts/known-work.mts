import { ToolError } from './errors.mts';
import { readEpochCounters } from './in-app-sample.mts';
import type {
  InAppBoundary,
  SampledEpoch,
  SamplePlan,
} from './in-app-sample.mts';

export interface KnownWorkEvidence {
  cpuCount: number;
  reportedThermalState: number;
  appBoundaries: readonly InAppBoundary[];
  epochs: readonly SampledEpoch[];
}

export interface KnownWorkEpoch {
  index: number;
  load: string;
  plannedUnits: number;
  units: number;
  otherUnits: number;
  seconds: number;
  instructions: number;
  loadInstructions: number | null;
  processInstructionRate: number;
  processClockRate: number | null;
  performanceCoreShare: number | null;
}

export interface KnownWorkGate {
  name: string;
  measured: number | null;
  expected: number;
  tolerance: number;
  passes: boolean;
}

export interface KnownWorkDerivation {
  thermalState: number;
  epochs: KnownWorkEpoch[];
  gates: KnownWorkGate[];
}

export const KNOWN_WORK_SCENARIO = 'crosscheck-load';

export const KNOWN_WORK_UNITS = 1000;

export const KNOWN_WORK_INSTRUCTIONS_PER_UNIT = 3_000_004;

export const KNOWN_WORK_TOLERANCE = 0.01;

export const KNOWN_WORK_PLAN: SamplePlan = {
  epochs: [
    idle(),
    work('known-work'),
    idle(),
    work('known-work-double'),
    idle(),
    work('known-work-background'),
    idle(),
    work('known-work-ended'),
    idle(),
  ],
  start: 'ready',
};

const PLANNED_UNITS: Record<string, number> = {
  'known-work': KNOWN_WORK_UNITS,
  'known-work-double': 2 * KNOWN_WORK_UNITS,
  'known-work-background': KNOWN_WORK_UNITS,
  'known-work-ended': KNOWN_WORK_UNITS,
};

const NANOSECONDS_PER_SECOND = 1e9;

export function deriveKnownWork(
  evidence: KnownWorkEvidence
): KnownWorkDerivation {
  const { appBoundaries, cpuCount } = evidence;
  const measured = evidence.epochs.map((epoch, index) => {
    const start = appBoundaries[index];
    const end = appBoundaries[index + 1];
    const counters = readEpochCounters(start, end, cpuCount, index);
    return {
      index,
      load: epoch.load,
      plannedUnits: PLANNED_UNITS[epoch.load] ?? 0,
      units: epoch.work.own,
      otherUnits: epoch.work.other,
      seconds:
        (counters.instructionSpan.endNs - counters.instructionSpan.startNs) /
        NANOSECONDS_PER_SECOND,
      instructions: end.processInstructions - start.processInstructions,
      processInstructionRate: counters.processInstructionRate,
      processClockRate: counters.processClockRate,
      performanceCoreShare: counters.performanceCoreShare,
    };
  });
  const epochs = measured.map((epoch, index) => ({
    ...epoch,
    loadInstructions:
      epoch.plannedUnits === 0
        ? null
        : epoch.instructions - baselineRate(measured, index) * epoch.seconds,
  }));
  return {
    thermalState: Math.max(
      evidence.reportedThermalState,
      ...appBoundaries.map(({ thermal }) => thermal)
    ),
    epochs,
    gates: knownWorkGates(epochs),
  };
}

function idle() {
  return { load: 'idle', collector: 'endpoints' as const, seconds: 4 };
}

function work(load: string) {
  return { load, collector: 'endpoints' as const, seconds: 6 };
}

function baselineRate(
  epochs: readonly { load: string; instructions: number; seconds: number }[],
  index: number
): number {
  const neighbours = [epochs[index - 1], epochs[index + 1]];
  if (neighbours.some((epoch) => epoch?.load !== 'idle')) {
    throw new ToolError(
      `The known-work epoch ${index} needs an idle epoch before and after it`
    );
  }
  const rates = neighbours.map(
    (epoch) => (epoch?.instructions ?? 0) / (epoch?.seconds ?? 1)
  );
  return (rates[0] + rates[1]) / 2;
}

function knownWorkGates(epochs: readonly KnownWorkEpoch[]): KnownWorkGate[] {
  const loadOf = (load: string) =>
    epochs.find((epoch) => epoch.load === load)?.loadInstructions ?? null;
  const single = loadOf('known-work');
  const ratioTo = (load: string) => {
    const value = loadOf(load);
    return value === null || single === null || single <= 0
      ? null
      : value / single;
  };
  return [
    ...epochs
      .filter((epoch) => epoch.plannedUnits > 0)
      .map((epoch) =>
        gate(
          `\`${epoch.load}\` ran its planned units`,
          epoch.units,
          epoch.plannedUnits,
          0
        )
      ),
    gate(
      'no epoch counted units of another load',
      epochs.reduce((sum, epoch) => sum + epoch.otherUnits, 0),
      0,
      0
    ),
    gate(
      '`known-work`: instructions of the load against the count of the disassembly',
      single,
      KNOWN_WORK_UNITS * KNOWN_WORK_INSTRUCTIONS_PER_UNIT,
      KNOWN_WORK_TOLERANCE
    ),
    gate(
      '`known-work-double` against `known-work` (linearity)',
      ratioTo('known-work-double'),
      2,
      KNOWN_WORK_TOLERANCE
    ),
    gate(
      '`known-work-background` (background QoS) against `known-work` (user-interactive QoS)',
      ratioTo('known-work-background'),
      1,
      KNOWN_WORK_TOLERANCE
    ),
    gate(
      '`known-work-ended` (a thread that ended before the end read) against `known-work`',
      ratioTo('known-work-ended'),
      1,
      KNOWN_WORK_TOLERANCE
    ),
  ];
}

function gate(
  name: string,
  measured: number | null,
  expected: number,
  tolerance: number
): KnownWorkGate {
  return {
    name,
    measured,
    expected,
    tolerance,
    passes:
      measured !== null &&
      Math.abs(measured - expected) <= tolerance * Math.abs(expected),
  };
}
