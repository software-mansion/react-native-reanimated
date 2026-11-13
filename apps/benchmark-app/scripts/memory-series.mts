import { ToolError } from './errors.mts';
import { blockOrder } from './session.mts';
import { median } from './statistics.mts';

export interface MemoryValues {
  totalPss: number;
  nativeHeap: number;
  dalvikHeap: number;
  graphics: number;
  privateOther: number;
  totalSwapPss: number;
}

export type MemoryReading = MemoryValues & { seconds: number };

export interface MemorySchedule {
  intervalSeconds: number;
  durationSeconds: number;
}

export type LeakVerdict = 'rises' | 'stable' | 'not decided';

export const DEFAULT_LAUNCHES = 2;
export const DEFAULT_INTERVAL_SECONDS = 60;
export const DEFAULT_DURATION_SECONDS = 1200;
export const DEFAULT_SLOPE_LIMIT = 1000;
export const MINIMUM_READINGS = 4;
export const LAUNCHES_PER_BLOCK = blockOrder(0).filter(
  (variant) => variant === 'a'
).length;
export const TAIL_LEVEL_START = 0.75;
export const TAIL_SLOPE_START = 0.5;

const SECONDS_PER_MINUTE = 60;
const MEMINFO_PATTERNS: Record<keyof MemoryValues, RegExp> = {
  totalPss: /TOTAL PSS:\s+(\d+)/,
  nativeHeap: /^\s*Native Heap\s+(\d+)/m,
  dalvikHeap: /^\s*Dalvik Heap\s+(\d+)/m,
  graphics: /^\s*Graphics:\s+(\d+)/m,
  privateOther: /^\s*Private Other:\s+(\d+)/m,
  totalSwapPss: /TOTAL SWAP PSS:\s+(\d+)/,
};
const MEMINFO_FIELDS = Object.keys(MEMINFO_PATTERNS) as (keyof MemoryValues)[];

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

export function readingTimes(schedule: MemorySchedule): number[] {
  return Array.from(
    { length: schedule.durationSeconds / schedule.intervalSeconds },
    (_, i) => (i + 1) * schedule.intervalSeconds
  );
}

export function parseMeminfo(output: string): MemoryValues {
  const missing = MEMINFO_FIELDS.filter(
    (field) => !MEMINFO_PATTERNS[field].test(output)
  );
  if (missing.length > 0) {
    throw new ToolError(
      `Cannot read ${missing.join(', ')} from dumpsys meminfo:\n${output.slice(0, 500)}`
    );
  }
  const read = (field: keyof MemoryValues) =>
    Number(MEMINFO_PATTERNS[field].exec(output)?.[1]);
  return {
    totalPss: read('totalPss'),
    nativeHeap: read('nativeHeap'),
    dalvikHeap: read('dalvikHeap'),
    graphics: read('graphics'),
    privateOther: read('privateOther'),
    totalSwapPss: read('totalSwapPss'),
  };
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
  slopeLimit: number
): LeakVerdict {
  if (slopes.length < launches) {
    return 'not decided';
  }
  return slopes.every((slope) => slope > slopeLimit) ? 'rises' : 'stable';
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
