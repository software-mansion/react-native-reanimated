export interface CpuInterval {
  cpu: number;
  start: number;
  end: number;
}

export interface FrequencyInterval extends CpuInterval {
  khz: number;
}

export interface CycleSegment {
  start: number;
  end: number;
  khz: number | null;
}

export interface CycleCount {
  cycles: number;
  runningNs: number;
  knownNs: number;
}

const KHZ_NS_PER_CYCLE = 1e6;

export function cycleSegments(
  running: readonly CpuInterval[],
  frequencies: readonly FrequencyInterval[]
): CycleSegment[] {
  const byCpu = frequenciesByCpu(frequencies);
  return running
    .flatMap((interval) =>
      splitByFrequency(interval, byCpu.get(interval.cpu) ?? [])
    )
    .sort((left, right) => left.start - right.start);
}

export function countCycles(
  segments: readonly CycleSegment[],
  within?: { start: number; end: number }
): CycleCount {
  const count: CycleCount = { cycles: 0, runningNs: 0, knownNs: 0 };
  for (const segment of segments) {
    const start = within
      ? Math.max(segment.start, within.start)
      : segment.start;
    const end = within ? Math.min(segment.end, within.end) : segment.end;
    if (end <= start) {
      continue;
    }
    count.runningNs += end - start;
    if (segment.khz !== null) {
      count.knownNs += end - start;
      count.cycles += ((end - start) * segment.khz) / KHZ_NS_PER_CYCLE;
    }
  }
  return count;
}

function frequenciesByCpu(
  frequencies: readonly FrequencyInterval[]
): Map<number, FrequencyInterval[]> {
  const byCpu = new Map<number, FrequencyInterval[]>();
  for (const frequency of frequencies) {
    const list = byCpu.get(frequency.cpu) ?? [];
    list.push(frequency);
    byCpu.set(frequency.cpu, list);
  }
  for (const list of byCpu.values()) {
    list.sort((left, right) => left.start - right.start);
  }
  return byCpu;
}

function splitByFrequency(
  interval: CpuInterval,
  frequencies: readonly FrequencyInterval[]
): CycleSegment[] {
  const segments: CycleSegment[] = [];
  let covered = interval.start;
  for (
    let i = firstEndingAfter(frequencies, interval.start);
    i < frequencies.length && frequencies[i].start < interval.end;
    i++
  ) {
    const start = Math.max(frequencies[i].start, interval.start);
    const end = Math.min(frequencies[i].end, interval.end);
    if (start > covered) {
      segments.push({ start: covered, end: start, khz: null });
    }
    if (end > start) {
      segments.push({ start, end, khz: frequencies[i].khz });
      covered = Math.max(covered, end);
    }
  }
  if (covered < interval.end) {
    segments.push({ start: covered, end: interval.end, khz: null });
  }
  return segments;
}

function firstEndingAfter(
  frequencies: readonly FrequencyInterval[],
  time: number
): number {
  let low = 0;
  let high = frequencies.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (frequencies[middle].end <= time) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}
