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

export interface EpochReading {
  window: EpochWindow;
  counterSpans: Record<CpuCounter, TimeSpan>;
  cpu: EpochCpu;
  cpuUncertainty: Record<CpuCounter, number>;
  counterCores: Record<CpuCounter, number>;
  updates: EpochUpdates | null;
  mountBatchCount: number;
  memory: number;
  windowMemoryDelta: number;
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

const SAMPLE_FORMAT = 3;

const NANOSECONDS_PER_MS = 1e6;

const NANOSECONDS_PER_SECOND = 1e9;

// A counter adds the user time and the system time, each in whole µs.
const COUNTER_DELTA_ERROR_US = 2;

const MAXIMUM_WINDOW_UNCERTAINTY = 0.001;

const CADENCE_TOLERANCE = 0.25;

const BATTERY_STATES = ['unknown', 'unplugged', 'charging', 'full'];

const EPOCH_LOAD = /^[a-z][a-z-]*$/;

const EPOCH_SECONDS = /^\d+(\.\d+)?$/;

const COUNTER_FIELDS: Record<
  CpuCounter,
  {
    startNs: keyof InAppBoundary;
    endNs: keyof InAppBoundary;
    valueUs: keyof InAppBoundary;
  }
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

const READ_ORDER = [
  'uiReadStartNs',
  'uiReadEndNs',
  'jsReadStartNs',
  'jsReadEndNs',
  'processReadStartNs',
  'processReadEndNs',
  'footprintReadStartNs',
  'footprintReadEndNs',
  'signpostStartNs',
  'signpostEndNs',
] as const satisfies readonly (keyof InAppBoundary)[];

const COUNTERS = [
  'uiThreadCpuUs',
  'jsThreadCpuUs',
  'processCpuUs',
  'mounts',
  'updates',
] as const satisfies readonly (keyof InAppBoundary)[];

const BOUNDARY: Check = shape({
  uiReadStartNs: anInteger,
  uiReadEndNs: anInteger,
  uiThreadCpuUs: anInteger,
  jsReadStartNs: anInteger,
  jsReadEndNs: anInteger,
  jsThreadCpuUs: anInteger,
  processReadStartNs: anInteger,
  processReadEndNs: anInteger,
  processCpuUs: anInteger,
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
  boundaries: listOf(BOUNDARY),
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
  checkCounters(start, end, index);
  const window = epochWindow(start, end, index);
  const counterSpans = mapCounters((counter) => ({
    startNs: readMidpoint(start, counter),
    endNs: readMidpoint(end, counter),
  }));
  for (const counter of CPU_COUNTERS) {
    if (!(spanLength(counterSpans[counter]) > 0)) {
      throw new ToolError(
        `Epoch ${index}: the reads of the counter ${counter} are not in time order`
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
  checkProcessSum(start, end, index);
  const counterCores = mapCounters((counter) =>
    counter === 'process' ? sample.cpuCount : 1
  );
  return {
    window,
    counterSpans,
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
    updates:
      sample.epochs[index].collector === 'full'
        ? epochUpdates(sample, start, end, window, refreshRate, index)
        : null,
    mountBatchCount: end.mounts - start.mounts,
    memory: end.footprintKb,
    windowMemoryDelta: end.footprintKb - start.footprintKb,
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
    endNs: boundary.processReadEndNs,
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

function checkReadOrder(boundaries: readonly InAppBoundary[]) {
  boundaries.forEach((boundary, index) => {
    const times = READ_ORDER.map((field) => ({ field, ns: boundary[field] }));
    const previous = boundaries[index - 1];
    if (previous) {
      times.unshift({ field: 'signpostEndNs', ns: previous.signpostEndNs });
    }
    times.slice(1).forEach((time, i) => {
      const before = times[i];
      if (time.ns < before.ns) {
        throw new ToolError(
          `Boundary ${index} of the SAMPLE line: ${time.field} (${time.ns} ns) is before ${before.field} (${before.ns} ns)${i === 0 && previous ? ' of the boundary before it' : ''}. The reads are not in the order of the sampler.`
        );
      }
    });
  });
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

// The process count covers at least the time from the end of its start read
// to the start of its end read. A thread count can also have the time from the
// start of its start read to the end of the process start read. One thread
// runs on one core at most, so that time is the limit for each thread.
function checkProcessSum(
  start: InAppBoundary,
  end: InAppBoundary,
  index: number
) {
  const delta = (field: keyof InAppBoundary) =>
    (end[field] as number) - (start[field] as number);
  const threadsUs = delta('uiThreadCpuUs') + delta('jsThreadCpuUs');
  const allowedUs =
    (start.processReadEndNs - start.uiReadStartNs) / 1e3 +
    (start.processReadEndNs - start.jsReadStartNs) / 1e3 +
    CPU_COUNTERS.length * COUNTER_DELTA_ERROR_US;
  if (delta('processCpuUs') < threadsUs - allowedUs) {
    throw new ToolError(
      `Epoch ${index}: the process CPU time (${delta('processCpuUs')} µs) is less than the sum of the main thread and the JS thread (${threadsUs} µs) by more than the read delay and the counter resolution (${allowedUs} µs). A counter read gives a wrong unit or a wrong thread.`
    );
  }
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

function readMidpoint(boundary: InAppBoundary, counter: CpuCounter): number {
  const { startNs, endNs } = COUNTER_FIELDS[counter];
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
