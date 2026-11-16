import { ToolError } from './errors.mts';
import {
  aBoolean,
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

export type Collector = 'full' | 'endpoints';

export type CpuCounter = (typeof CPU_COUNTERS)[number];

export interface SampleEpoch {
  load: string;
  collector: Collector;
  seconds: number;
}

export interface EpochWork {
  own: number;
  other: number;
}

export interface SampledEpoch extends SampleEpoch {
  work: EpochWork;
}

export interface SamplePlan {
  epochs: readonly SampleEpoch[];
  start: 'ready' | 'notification';
}

export interface InAppBoundary {
  uiReadStartNs: number;
  uiReadEndNs: number;
  uiThreadCpuUs: number;
  jsReadStartNs: number;
  jsReadEndNs: number;
  jsThreadCpuUs: number;
  processReadStartNs: number;
  processReadEndNs: number;
  processCpuUs: number;
  processPerformanceCpuUs: number;
  processClusterSwitches: number;
  instructionReadStartNs: number;
  instructionReadEndNs: number;
  processInstructions: number;
  processCycles: number;
  footprintReadStartNs: number;
  footprintReadEndNs: number;
  footprintKb: number;
  signpostStartNs: number;
  signpostEndNs: number;
  thermal: number;
  batteryLevel: number;
  batteryState: number;
  lowPower: boolean;
  brightness: number;
  mounts: number;
  updates: number;
}

export interface InAppUpdates {
  beginNs: number[];
  endNs: number[];
  modelTimeNs: number[];
}

export interface InAppSample {
  mainThread: number;
  jsThread: number;
  cpuCount: number;
  maxThermal: number;
  epochs: SampledEpoch[];
  boundaries: InAppBoundary[];
  updates: InAppUpdates;
}

export interface AppState {
  batteryLevel: number;
  batteryState: string;
  lowPowerMode: boolean;
  brightness: number;
}

export interface TimeSpan {
  startNs: number;
  endNs: number;
}

export interface EpochWindow extends TimeSpan {
  seconds: number;
}

export interface EpochCpu {
  uiThreadCpu: number;
  jsThreadCpu: number;
  otherThreadsCpu: number;
  processCpu: number;
}

export interface UpdateSpan {
  beginNs: number;
  endNs: number;
}

export interface EpochUpdates {
  spans: UpdateSpan[];
  durationsMs: number[];
  expectedSlots: number;
  missedDisplayLinkCallbacks: number | null;
}

export interface EpochCounters {
  window: EpochWindow;
  counterSpans: Record<CpuCounter, TimeSpan>;
  instructionSpan: TimeSpan;
  cpu: EpochCpu;
  cpuUncertainty: Record<CpuCounter, number>;
  counterCores: Record<CpuCounter, number>;
  performanceCoreShare: number | null;
  clusterSwitches: number;
  processClockRate: number | null;
  processInstructionsPerCycle: number | null;
  processInstructionRate: number;
  threadSumExcess: number;
  mountBatchCount: number;
}

export interface EpochReading extends EpochCounters {
  updates: EpochUpdates | null;
  memory: number;
  windowMemoryDelta: number;
}

interface ReadFields {
  startNs: keyof InAppBoundary;
  endNs: keyof InAppBoundary;
}

export const SAMPLE_LINE_PREFIX = 'SAMPLE ';

export const START_NOTIFICATION = 'com.reanimatedbenchmark.start-epochs';

export const THERMAL_STATES = [
  'Nominal',
  'Fair',
  'Serious',
  'Critical',
] as const;

export const CPU_COUNTERS = ['uiThread', 'jsThread', 'process'] as const;

const SAMPLE_FORMAT = 5;

const NANOSECONDS_PER_MS = 1e6;

const NANOSECONDS_PER_SECOND = 1e9;

// A thread counter adds the user time and the system time, each in whole µs.
// A process counter is the whole µs of a value in Mach time units.
const COUNTER_DELTA_ERROR_US = 2;

const MAXIMUM_WINDOW_UNCERTAINTY = 0.001;

const MINIMUM_PROCESS_SHARE_OF_THREADS = 0.5;

const CYCLES_PER_US_PER_GHZ = 1e3;

const INSTRUCTIONS_PER_GIGA = 1e9;

const CADENCE_TOLERANCE = 0.25;

const BATTERY_STATES = ['unknown', 'unplugged', 'charging', 'full'];

const EPOCH_LOAD = /^[a-z][a-z-]*$/;

const EPOCH_SECONDS = /^\d+(\.\d+)?$/;

const COUNTER_FIELDS: Record<
  CpuCounter,
  ReadFields & { valueUs: keyof InAppBoundary }
> = {
  uiThread: {
    startNs: 'uiReadStartNs',
    endNs: 'uiReadEndNs',
    valueUs: 'uiThreadCpuUs',
  },
  jsThread: {
    startNs: 'jsReadStartNs',
    endNs: 'jsReadEndNs',
    valueUs: 'jsThreadCpuUs',
  },
  process: {
    startNs: 'processReadStartNs',
    endNs: 'processReadEndNs',
    valueUs: 'processCpuUs',
  },
};

const INSTRUCTION_READ: ReadFields = {
  startNs: 'instructionReadStartNs',
  endNs: 'instructionReadEndNs',
};

const READ_ORDER = [
  'uiReadStartNs',
  'uiReadEndNs',
  'jsReadStartNs',
  'jsReadEndNs',
  'processReadStartNs',
  'processReadEndNs',
  'instructionReadStartNs',
  'instructionReadEndNs',
  'footprintReadStartNs',
  'footprintReadEndNs',
  'signpostStartNs',
  'signpostEndNs',
] as const satisfies readonly (keyof InAppBoundary)[];

const COUNTERS = [
  'uiThreadCpuUs',
  'jsThreadCpuUs',
  'processCpuUs',
  'processPerformanceCpuUs',
  'processClusterSwitches',
  'processInstructions',
  'processCycles',
  'mounts',
  'updates',
] as const satisfies readonly (keyof InAppBoundary)[];

export const IN_APP_BOUNDARY: Check = shape({
  uiReadStartNs: anInteger,
  uiReadEndNs: anInteger,
  uiThreadCpuUs: anInteger,
  jsReadStartNs: anInteger,
  jsReadEndNs: anInteger,
  jsThreadCpuUs: anInteger,
  processReadStartNs: anInteger,
  processReadEndNs: anInteger,
  processCpuUs: anInteger,
  processPerformanceCpuUs: anInteger,
  processClusterSwitches: anInteger,
  instructionReadStartNs: anInteger,
  instructionReadEndNs: anInteger,
  processInstructions: anInteger,
  processCycles: anInteger,
  footprintReadStartNs: anInteger,
  footprintReadEndNs: anInteger,
  footprintKb: anInteger,
  signpostStartNs: anInteger,
  signpostEndNs: anInteger,
  thermal: anInteger,
  batteryLevel: anInteger,
  batteryState: anInteger,
  lowPower: aBoolean,
  brightness: anInteger,
  mounts: anInteger,
  updates: anInteger,
});

const SAMPLE: Check = shape({
  format: oneOf([SAMPLE_FORMAT]),
  error: nullable(aString),
  mainThread: anInteger,
  jsThread: anInteger,
  cpuCount: aPositiveNumber,
  maxThermal: anInteger,
  epochs: listOf(
    shape({
      load: aString,
      collector: oneOf(['full', 'endpoints']),
      seconds: aPositiveNumber,
      work: shape({ own: anInteger, other: anInteger }),
    })
  ),
  boundaries: listOf(IN_APP_BOUNDARY),
  updates: shape({
    beginNs: listOf(anInteger),
    endNs: listOf(anInteger),
    modelTimeNs: listOf(anInteger),
  }),
});

export function planArguments(plan: SamplePlan): string[] {
  return [
    '-benchmarkEpochs',
    plan.epochs
      .map(({ load, collector, seconds }) => `${load}:${collector}:${seconds}`)
      .join(','),
    '-benchmarkStart',
    plan.start,
  ];
}

export function parseEpochs(text: string): SampleEpoch[] {
  return text.split(',').map((item) => {
    const [load, collector, secondsText, ...rest] = item.split(':');
    const seconds = Number(secondsText);
    if (
      rest.length > 0 ||
      !EPOCH_LOAD.test(load) ||
      (collector !== 'full' && collector !== 'endpoints') ||
      !EPOCH_SECONDS.test(secondsText ?? '') ||
      !(seconds > 0)
    ) {
      throw new ToolError(
        `The epoch "${item}" is not <load>:<full|endpoints>:<seconds>, with a load of lowercase letters and hyphens`
      );
    }
    return { load, collector, seconds };
  });
}

export function planSeconds(plan: SamplePlan): number {
  return plan.epochs.reduce((sum, epoch) => sum + epoch.seconds, 0);
}

export function parseSampleLine(text: string, plan: SamplePlan): InAppSample {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ToolError(
      `The SAMPLE line of the app is not JSON: ${(error as Error).message}`
    );
  }
  const problems: string[] = [];
  SAMPLE(parsed, 'SAMPLE', problems);
  throwProblems('The SAMPLE line of the app has errors', problems);
  const report = parsed as InAppSample & { error: string | null };
  if (report.error !== null) {
    throw new ToolError(`The in-app sampler failed: ${report.error}`);
  }
  const sample: InAppSample = {
    mainThread: report.mainThread,
    jsThread: report.jsThread,
    cpuCount: report.cpuCount,
    maxThermal: report.maxThermal,
    epochs: report.epochs,
    boundaries: report.boundaries,
    updates: report.updates,
  };
  checkPlan(sample, plan);
  checkReadOrder(sample.boundaries);
  checkUpdates(sample);
  return sample;
}

export function readEpoch(
  sample: InAppSample,
  index: number,
  refreshRate: number
): EpochReading {
  const start = sample.boundaries[index];
  const end = sample.boundaries[index + 1];
  const counters = readEpochCounters(start, end, sample.cpuCount, index);
  return {
    ...counters,
    updates:
      sample.epochs[index].collector === 'full'
        ? epochUpdates(sample, start, end, counters.window, refreshRate, index)
        : null,
    memory: end.footprintKb,
    windowMemoryDelta: end.footprintKb - start.footprintKb,
  };
}

export function readEpochCounters(
  start: InAppBoundary,
  end: InAppBoundary,
  cpuCount: number,
  index: number
): EpochCounters {
  checkCounters(start, end, index);
  const window = epochWindow(start, end, index);
  const counterSpans = mapCounters((counter) =>
    readSpan(start, end, COUNTER_FIELDS[counter])
  );
  const instructionSpan = readSpan(start, end, INSTRUCTION_READ);
  for (const [name, span] of [
    ...Object.entries(counterSpans),
    ['instructions', instructionSpan],
  ] as const) {
    if (!(spanLength(span) > 0)) {
      throw new ToolError(
        `Epoch ${index}: the reads of the counter ${name} are not in time order`
      );
    }
  }
  const perSecond = (counter: CpuCounter) => {
    const { valueUs } = COUNTER_FIELDS[counter];
    const seconds = spanSeconds(counterSpans[counter]);
    return (
      ((end[valueUs] as number) - (start[valueUs] as number)) / 1e3 / seconds
    );
  };
  const uiThreadCpu = perSecond('uiThread');
  const jsThreadCpu = perSecond('jsThread');
  const processCpu = perSecond('process');
  checkProcessUnit(start, end, index);
  checkPerformanceCoreTime(start, end, index);
  const counterCores = mapCounters((counter) =>
    counter === 'process' ? cpuCount : 1
  );
  return {
    window,
    counterSpans,
    instructionSpan,
    cpu: {
      uiThreadCpu,
      jsThreadCpu,
      otherThreadsCpu: processCpu - uiThreadCpu - jsThreadCpu,
      processCpu,
    },
    cpuUncertainty: mapCounters(
      (counter) =>
        ((readHalfWidthNs(start, counter) + readHalfWidthNs(end, counter)) *
          counterCores[counter] +
          COUNTER_DELTA_ERROR_US * 1e3) /
        NANOSECONDS_PER_MS /
        spanSeconds(counterSpans[counter])
    ),
    counterCores,
    performanceCoreShare: performanceCoreShare(start, end),
    clusterSwitches: end.processClusterSwitches - start.processClusterSwitches,
    ...processInstructionCounts(start, end, instructionSpan),
    threadSumExcess: threadSumExcess(start, end),
    mountBatchCount: end.mounts - start.mounts,
  };
}

export function highestThermalState(sample: InAppSample): number {
  return Math.max(
    sample.maxThermal,
    ...sample.boundaries.map((boundary) => boundary.thermal)
  );
}

export function appStates(sample: InAppSample): AppState[] {
  return sample.boundaries.map((boundary) => {
    const batteryState = BATTERY_STATES[boundary.batteryState];
    if (batteryState === undefined) {
      throw new ToolError(
        `The SAMPLE line has the unknown batteryState ${boundary.batteryState}`
      );
    }
    return {
      batteryLevel: boundary.batteryLevel,
      batteryState,
      lowPowerMode: boundary.lowPower,
      brightness: boundary.brightness,
    };
  });
}

export function boundaryReadSpan(boundary: InAppBoundary): TimeSpan {
  return {
    startNs: boundary.uiReadStartNs,
    endNs: boundary.instructionReadEndNs,
  };
}

export function footprintReadSpan(boundary: InAppBoundary): TimeSpan {
  return {
    startNs: boundary.footprintReadStartNs,
    endNs: boundary.footprintReadEndNs,
  };
}

function checkPlan(sample: InAppSample, plan: SamplePlan) {
  const sameEpochs =
    sample.epochs.length === plan.epochs.length &&
    sample.epochs.every(
      (epoch, i) =>
        epoch.load === plan.epochs[i].load &&
        epoch.collector === plan.epochs[i].collector &&
        epoch.seconds === plan.epochs[i].seconds
    );
  if (!sameEpochs) {
    throw new ToolError(
      `The SAMPLE line has the epochs ${JSON.stringify(sample.epochs)}, the driver planned ${JSON.stringify(plan.epochs)}`
    );
  }
  if (sample.boundaries.length !== plan.epochs.length + 1) {
    throw new ToolError(
      `The SAMPLE line has ${sample.boundaries.length} boundaries for ${plan.epochs.length} epochs, expected ${plan.epochs.length + 1}`
    );
  }
}

export function readOrderProblems(
  boundaries: readonly InAppBoundary[]
): string[] {
  return boundaries.flatMap((boundary, index) => {
    const times = READ_ORDER.map((field) => ({ field, ns: boundary[field] }));
    const previous = boundaries[index - 1];
    if (previous) {
      times.unshift({ field: 'signpostEndNs', ns: previous.signpostEndNs });
    }
    return times.slice(1).flatMap((time, i) => {
      const before = times[i];
      return time.ns < before.ns
        ? [
            `Boundary ${index} of the SAMPLE line: ${time.field} (${time.ns} ns) is before ${before.field} (${before.ns} ns)${i === 0 && previous ? ' of the boundary before it' : ''}. The reads are not in the order of the sampler.`,
          ]
        : [];
    });
  });
}

function checkReadOrder(boundaries: readonly InAppBoundary[]) {
  const [problem] = readOrderProblems(boundaries);
  if (problem !== undefined) {
    throw new ToolError(problem);
  }
}

function checkUpdates({ updates, boundaries }: InAppSample) {
  const count = updates.beginNs.length;
  if (updates.endNs.length !== count || updates.modelTimeNs.length !== count) {
    throw new ToolError(
      'The update lists of the SAMPLE line do not have the same length'
    );
  }
  if (boundaries.at(-1)?.updates !== count) {
    throw new ToolError(
      `The SAMPLE line has ${count} updates, and its last boundary counts ${boundaries.at(-1)?.updates}`
    );
  }
}

function checkCounters(
  start: InAppBoundary,
  end: InAppBoundary,
  index: number
) {
  for (const counter of COUNTERS) {
    if (end[counter] < start[counter]) {
      throw new ToolError(
        `Epoch ${index}: the counter ${counter} goes down from ${start[counter]} to ${end[counter]}`
      );
    }
  }
}

function epochWindow(
  start: InAppBoundary,
  end: InAppBoundary,
  index: number
): EpochWindow {
  const startNs = spanMidpoint(boundaryReadSpan(start));
  const endNs = spanMidpoint(boundaryReadSpan(end));
  const lengthNs = endNs - startNs;
  const uncertaintyNs =
    spanLength(boundaryReadSpan(start)) + spanLength(boundaryReadSpan(end));
  if (
    !(lengthNs > 0) ||
    uncertaintyNs > MAXIMUM_WINDOW_UNCERTAINTY * lengthNs
  ) {
    throw new ToolError(
      `Epoch ${index}: the counter reads take ${uncertaintyNs} ns of a window of ${lengthNs} ns, more than ${MAXIMUM_WINDOW_UNCERTAINTY * 100}%`
    );
  }
  return { startNs, endNs, seconds: lengthNs / NANOSECONDS_PER_SECOND };
}

function checkProcessUnit(
  start: InAppBoundary,
  end: InAppBoundary,
  index: number
) {
  const processUs = end.processCpuUs - start.processCpuUs;
  const allowedUs = readAllowanceUs(start);
  const threadsUs = threadsDeltaUs(start, end);
  if (processUs + allowedUs < MINIMUM_PROCESS_SHARE_OF_THREADS * threadsUs) {
    throw new ToolError(
      `Epoch ${index}: the process CPU time (${processUs} µs) and the read allowance (${allowedUs} µs) are less than ${MINIMUM_PROCESS_SHARE_OF_THREADS * 100}% of the sum of the main thread and the JS thread (${threadsUs} µs). The process and thread counters are not consistent.`
    );
  }
}

function threadSumExcess(start: InAppBoundary, end: InAppBoundary): number {
  return Math.max(
    0,
    threadsDeltaUs(start, end) -
      (end.processCpuUs - start.processCpuUs) -
      readAllowanceUs(start)
  );
}

// The process count covers at least the time from the end of its start read
// to the start of its end read. A thread count can also have the time from the
// start of its start read to the end of the process start read. One thread
// runs on one core at most, so that time is the limit for each thread.
function readAllowanceUs(start: InAppBoundary): number {
  return (
    (start.processReadEndNs - start.uiReadStartNs) / 1e3 +
    (start.processReadEndNs - start.jsReadStartNs) / 1e3 +
    CPU_COUNTERS.length * COUNTER_DELTA_ERROR_US
  );
}

function threadsDeltaUs(start: InAppBoundary, end: InAppBoundary): number {
  return (
    end.uiThreadCpuUs -
    start.uiThreadCpuUs +
    end.jsThreadCpuUs -
    start.jsThreadCpuUs
  );
}

function checkPerformanceCoreTime(
  start: InAppBoundary,
  end: InAppBoundary,
  index: number
) {
  const processUs = end.processCpuUs - start.processCpuUs;
  const performanceUs =
    end.processPerformanceCpuUs - start.processPerformanceCpuUs;
  if (performanceUs > processUs + COUNTER_DELTA_ERROR_US) {
    throw new ToolError(
      `Epoch ${index}: the process CPU time on the performance cores (${performanceUs} µs) is more than the process CPU time (${processUs} µs) by more than the counter resolution (${COUNTER_DELTA_ERROR_US} µs)`
    );
  }
}

function performanceCoreShare(
  start: InAppBoundary,
  end: InAppBoundary
): number | null {
  const processUs = end.processCpuUs - start.processCpuUs;
  return processUs > 0
    ? (end.processPerformanceCpuUs - start.processPerformanceCpuUs) / processUs
    : null;
}

function processInstructionCounts(
  start: InAppBoundary,
  end: InAppBoundary,
  span: TimeSpan
): Pick<
  EpochCounters,
  'processClockRate' | 'processInstructionsPerCycle' | 'processInstructionRate'
> {
  const cpuUs = end.processCpuUs - start.processCpuUs;
  const cycles = end.processCycles - start.processCycles;
  const instructions = end.processInstructions - start.processInstructions;
  return {
    processClockRate: cpuUs > 0 ? cycles / cpuUs / CYCLES_PER_US_PER_GHZ : null,
    processInstructionsPerCycle: cycles > 0 ? instructions / cycles : null,
    processInstructionRate:
      instructions / spanSeconds(span) / INSTRUCTIONS_PER_GIGA,
  };
}

function epochUpdates(
  { updates }: InAppSample,
  start: InAppBoundary,
  end: InAppBoundary,
  window: EpochWindow,
  refreshRate: number,
  index: number
): EpochUpdates {
  const spans: UpdateSpan[] = [];
  const modelTimes: number[] = [];
  for (let i = start.updates; i < end.updates; i++) {
    const span = { beginNs: updates.beginNs[i], endNs: updates.endNs[i] };
    if (
      span.endNs < span.beginNs ||
      span.beginNs < start.signpostEndNs ||
      span.endNs > end.uiReadStartNs
    ) {
      throw new ToolError(
        `Epoch ${index}: the UI update ${i} (${span.beginNs} ns to ${span.endNs} ns) is not inside the epoch (${start.signpostEndNs} ns to ${end.uiReadStartNs} ns)`
      );
    }
    spans.push(span);
    modelTimes.push(updates.modelTimeNs[i]);
  }
  const periodNs = NANOSECONDS_PER_SECOND / refreshRate;
  return {
    spans,
    durationsMs: spans.map(
      ({ beginNs, endNs }) => (endNs - beginNs) / NANOSECONDS_PER_MS
    ),
    expectedSlots: refreshRate * window.seconds,
    missedDisplayLinkCallbacks: missedSlotShare(modelTimes, periodNs, index),
  };
}

function missedSlotShare(
  modelTimes: number[],
  periodNs: number,
  index: number
): number | null {
  if (modelTimes.length < 2) {
    return null;
  }
  const gaps: number[] = [];
  for (let i = 1; i < modelTimes.length; i++) {
    const periods = (modelTimes[i] - modelTimes[i - 1]) / periodNs;
    const rounded = Math.round(periods);
    if (rounded < 1 || Math.abs(periods - rounded) > CADENCE_TOLERANCE) {
      throw new ToolError(
        `Epoch ${index}: the model times of the UI updates ${i - 1} and ${i} are ${periods.toFixed(3)} display periods apart. The updates are not on a fixed cadence of ${(periodNs / NANOSECONDS_PER_MS).toFixed(3)} ms.`
      );
    }
    gaps.push(rounded);
  }
  const shortest = Math.min(...gaps);
  if (shortest > 1) {
    throw new ToolError(
      `Epoch ${index}: each UI update is ${shortest} or more display periods after the one before it. The app updates at most at 1/${shortest} of the display rate in the whole epoch.`
    );
  }
  const slots = gaps.reduce((sum, gap) => sum + gap, 0);
  return (slots - gaps.length) / slots;
}

function mapCounters<T>(
  value: (counter: CpuCounter) => T
): Record<CpuCounter, T> {
  return {
    uiThread: value('uiThread'),
    jsThread: value('jsThread'),
    process: value('process'),
  };
}

function readSpan(
  start: InAppBoundary,
  end: InAppBoundary,
  fields: ReadFields
): TimeSpan {
  return {
    startNs: readMidpoint(start, fields),
    endNs: readMidpoint(end, fields),
  };
}

function readMidpoint(
  boundary: InAppBoundary,
  { startNs, endNs }: ReadFields
): number {
  return ((boundary[startNs] as number) + (boundary[endNs] as number)) / 2;
}

function readHalfWidthNs(boundary: InAppBoundary, counter: CpuCounter): number {
  const { startNs, endNs } = COUNTER_FIELDS[counter];
  return ((boundary[endNs] as number) - (boundary[startNs] as number)) / 2;
}

function spanMidpoint(span: TimeSpan): number {
  return (span.startNs + span.endNs) / 2;
}

function spanLength(span: TimeSpan): number {
  return span.endNs - span.startNs;
}

function spanSeconds(span: TimeSpan): number {
  return spanLength(span) / NANOSECONDS_PER_SECOND;
}
