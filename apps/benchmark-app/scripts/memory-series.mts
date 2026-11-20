import type { VariantKey } from './config.mts';
import { ToolError } from './errors.mts';
import { balancedOrder } from './session.mts';
import { median } from './statistics.mts';

export interface MemoryValues {
  totalPss: number;
  nativeHeap: number;
  dalvikHeap: number;
  graphics: number;
  privateOther: number;
  totalSwapPss: number | null;
}

export interface FrameCounter {
  pid: number;
  statsSinceNs: number;
  frameCount: number;
}

export interface CountedFrames {
  frameSeconds: number;
  frameCount: number;
  statsSinceNs: number;
}

export type MemoryReading = MemoryValues &
  CountedFrames & {
    plannedSeconds: number;
    seconds: number;
    meminfoMs: number;
    batteryLevel: number;
    batteryTemperature: number;
  };

export interface ReadingProblem {
  cause: 'late' | 'reset' | 'drawing';
  detail: string;
}

export interface MemorySchedule {
  intervalSeconds: number;
  durationSeconds: number;
}

export type LeakVerdict =
  | 'rises'
  | 'no rise found'
  | 'mixed'
  | 'not decided'
  | `not judged (duration under ${typeof MINIMUM_JUDGED_DURATION_SECONDS} s)`;

export const MINIMUM_JUDGED_DURATION_SECONDS = 600;

export const DEFAULT_LAUNCHES = 2;

export const DEFAULT_INTERVAL_SECONDS = 60;

export const DEFAULT_DURATION_SECONDS = 1200;

export const DEFAULT_SLOPE_LIMIT = 1000;

const MINIMUM_READINGS = 4;

export const TAIL_LEVEL_START = 0.75;

export const TAIL_SLOPE_START = 0.5;

export const LATE_LIMIT_SHARE = 0.5;

export const DRAWING_FLOOR_SHARE = 0.25;

const SECONDS_PER_MINUTE = 60;

const LAUNCHES_PER_ORDER = balancedOrder(0).length;

const VARIANTS_IN_TEST = 2;

const NO_PROCESS_PATTERN = /^No process found for: /m;

const GFXINFO_HEADER_PATTERN =
  /^\*\* Graphics info for pid (\d+) \[[^\]]+\] \*\*/m;

const STATS_SINCE_PATTERN = /^Stats since: (\d+)ns/m;

const TOTAL_FRAMES_PATTERN = /^Total frames rendered: (\d+)/m;

type PssField = Exclude<keyof MemoryValues, 'totalSwapPss'>;

const MEMINFO_PATTERNS: Record<PssField, RegExp> = {
  totalPss: /TOTAL PSS:\s+(\d+)/,
  nativeHeap: /^\s*Native Heap\s+(\d+)/m,
  dalvikHeap: /^\s*Dalvik Heap\s+(\d+)/m,
  graphics: /^\s*Graphics:\s+(\d+)/m,
  privateOther: /^\s*Private Other:\s+(\d+)/m,
};

const MEMINFO_FIELDS = Object.keys(MEMINFO_PATTERNS) as PssField[];

const SWAP_PSS_PATTERN = /TOTAL SWAP PSS:\s+(\d+)/;

const SWAP_WITHOUT_PSS_PATTERN = /TOTAL SWAP \(KB\):\s+\d+/;

export function checkSchedule(schedule: MemorySchedule) {
  const { intervalSeconds, durationSeconds } = schedule;
  if (
    durationSeconds % intervalSeconds !== 0 ||
    durationSeconds < MINIMUM_READINGS * intervalSeconds
  ) {
    throw new ToolError(
      `--duration must be a multiple of --interval and at least ${MINIMUM_READINGS} times --interval (now ${durationSeconds} s and ${intervalSeconds} s)`
    );
  }
}

export function memoryLaunchOrder(launch: number): VariantKey[] {
  const order = balancedOrder(Math.floor(launch / LAUNCHES_PER_ORDER));
  return [order[launch % LAUNCHES_PER_ORDER]];
}

export function launchCount(launchesForEachVariant: number): number {
  return VARIANTS_IN_TEST * launchesForEachVariant;
}

export function drawingFloor(refreshRate: number): number {
  return DRAWING_FLOOR_SHARE * refreshRate;
}

export function readingTimes(schedule: MemorySchedule): number[] {
  return Array.from(
    { length: schedule.durationSeconds / schedule.intervalSeconds },
    (_, i) => (i + 1) * schedule.intervalSeconds
  );
}

export function parseMeminfo(output: string): MemoryValues | null {
  if (NO_PROCESS_PATTERN.test(output)) {
    return null;
  }
  const swapPss = SWAP_PSS_PATTERN.exec(output)?.[1];
  const missing = [
    ...MEMINFO_FIELDS.filter((field) => !MEMINFO_PATTERNS[field].test(output)),
    ...(swapPss === undefined && !SWAP_WITHOUT_PSS_PATTERN.test(output)
      ? ['totalSwapPss']
      : []),
  ];
  if (missing.length > 0) {
    throw new ToolError(
      `Cannot read ${missing.join(', ')} from dumpsys meminfo:\n${output.slice(0, 500)}`
    );
  }
  const read = (field: PssField) =>
    Number(MEMINFO_PATTERNS[field].exec(output)?.[1]);
  return {
    totalPss: read('totalPss'),
    nativeHeap: read('nativeHeap'),
    dalvikHeap: read('dalvikHeap'),
    graphics: read('graphics'),
    privateOther: read('privateOther'),
    totalSwapPss: swapPss === undefined ? null : Number(swapPss),
  };
}

export function parseGfxinfo(output: string): FrameCounter | null {
  if (NO_PROCESS_PATTERN.test(output)) {
    return null;
  }
  const header = GFXINFO_HEADER_PATTERN.exec(output);
  const stats = header ? output.slice(header.index) : '';
  const statsSince = STATS_SINCE_PATTERN.exec(stats)?.[1];
  const frames = TOTAL_FRAMES_PATTERN.exec(stats)?.[1];
  if (!header || statsSince === undefined || frames === undefined) {
    throw new ToolError(
      `Cannot read the pid, "Stats since" and "Total frames rendered" from dumpsys gfxinfo:\n${output.slice(0, 500)}`
    );
  }
  return {
    pid: Number(header[1]),
    statsSinceNs: Number(statsSince),
    frameCount: Number(frames),
  };
}

export function checkedFrameCounter(
  counter: FrameCounter | null,
  pid: number
): FrameCounter | string {
  if (counter === null) {
    return `dumpsys gfxinfo found no process of the app (process ${pid})`;
  }
  if (counter.pid !== pid) {
    return `dumpsys gfxinfo gives process ${counter.pid}, the launch has process ${pid}`;
  }
  return counter;
}

export function readingProblem(
  reading: MemoryReading,
  previous: CountedFrames,
  schedule: MemorySchedule,
  minimumFrameRate: number
): ReadingProblem | null {
  const lateLimit = LATE_LIMIT_SHARE * schedule.intervalSeconds;
  if (reading.seconds - reading.plannedSeconds > lateLimit) {
    return {
      cause: 'late',
      detail: `the reading of ${reading.plannedSeconds} s came at ${reading.seconds.toFixed(1)} s, more than ${lateLimit} s late`,
    };
  }
  if (
    reading.statsSinceNs !== previous.statsSinceNs ||
    reading.frameCount < previous.frameCount
  ) {
    return {
      cause: 'reset',
      detail: `the frame counter of dumpsys gfxinfo was reset before the reading of ${reading.plannedSeconds} s (stats since ${previous.statsSinceNs} ns -> ${reading.statsSinceNs} ns, frames ${previous.frameCount} -> ${reading.frameCount})`,
    };
  }
  const frames = reading.frameCount - previous.frameCount;
  const seconds = reading.frameSeconds - previous.frameSeconds;
  if (frames < minimumFrameRate * seconds) {
    return {
      cause: 'drawing',
      detail: `${frames} frames in the ${seconds.toFixed(1)} s before the reading of ${reading.plannedSeconds} s, expected at least ${minimumFrameRate} frames per second`,
    };
  }
  return null;
}

export function tailLevel(
  readings: readonly MemoryReading[],
  durationSeconds: number
): number {
  return median(
    readingsFrom(readings, TAIL_LEVEL_START * durationSeconds, 1).map(
      (reading) => reading.totalPss
    )
  );
}

export function tailSlope(
  readings: readonly MemoryReading[],
  durationSeconds: number
): number {
  const points = readingsFrom(readings, TAIL_SLOPE_START * durationSeconds, 2);
  const minutes = points.map((point) => point.seconds / SECONDS_PER_MINUTE);
  const meanMinute = mean(minutes);
  const meanPss = mean(points.map((point) => point.totalPss));
  const covariance = points.reduce(
    (sum, point, i) =>
      sum + (minutes[i] - meanMinute) * (point.totalPss - meanPss),
    0
  );
  const variance = minutes.reduce(
    (sum, minute) => sum + (minute - meanMinute) ** 2,
    0
  );
  return covariance / variance;
}

export function leakVerdict(
  slopes: readonly number[],
  launches: number,
  slopeLimit: number,
  durationSeconds: number
): LeakVerdict {
  if (slopes.length < launches) {
    return 'not decided';
  }
  if (durationSeconds < MINIMUM_JUDGED_DURATION_SECONDS) {
    return `not judged (duration under ${MINIMUM_JUDGED_DURATION_SECONDS} s)`;
  }
  const rising = slopes.filter((slope) => slope > slopeLimit).length;
  if (rising === slopes.length) {
    return 'rises';
  }
  return rising === 0 ? 'no rise found' : 'mixed';
}

export function exitCodeOfVerdicts(verdicts: readonly LeakVerdict[]): 0 | 1 {
  return verdicts.some(
    (verdict) => verdict === 'mixed' || verdict === 'not decided'
  )
    ? 1
    : 0;
}

function readingsFrom(
  readings: readonly MemoryReading[],
  fromSeconds: number,
  minimum: number
): MemoryReading[] {
  const selected = readings.filter((reading) => reading.seconds >= fromSeconds);
  if (new Set(selected.map((reading) => reading.seconds)).size < minimum) {
    throw new ToolError(
      `The memory series has fewer than ${minimum} readings at or after ${fromSeconds} s`
    );
  }
  return selected;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
