export interface Interval {
  low: number;
  high: number;
}

export type Comparison = 'relative' | 'absolute';

export interface ResamplingOptions {
  seed: number;
  iterations: number;
}

export interface BootstrapDraws {
  mediansA: Float64Array;
  mediansB: Float64Array;
}

const BOOTSTRAP: ResamplingOptions = {
  seed: 20261112,
  iterations: 10000,
};

const EXACT_SPLITS_LIMIT = 200_000;

const RANDOM_SPLITS: ResamplingOptions = {
  seed: 20261112,
  iterations: 20_000,
};

export function median(values: readonly number[]): number {
  return quantile(values, 0.5);
}

export function quantile(values: readonly number[], q: number): number {
  return sortedQuantile([...values].sort(byValue), q);
}

export function difference(
  medianA: number,
  medianB: number,
  comparison: Comparison
): number {
  return comparison === 'relative' ? medianB / medianA - 1 : medianB - medianA;
}

export function bootstrapDraws(
  a: readonly number[],
  b: readonly number[],
  options: ResamplingOptions = BOOTSTRAP
): BootstrapDraws {
  const random = createRandom(options.seed);
  const mediansA = new Float64Array(options.iterations);
  const mediansB = new Float64Array(options.iterations);
  for (let i = 0; i < options.iterations; i++) {
    mediansA[i] = median(resample(a, random));
    mediansB[i] = median(resample(b, random));
  }
  return { mediansA, mediansB };
}

export function bootstrapInterval(
  draws: BootstrapDraws,
  comparison: Comparison
): Interval {
  const statistics = draws.mediansA.map((medianA, i) =>
    difference(medianA, draws.mediansB[i], comparison)
  );
  statistics.sort();
  const sorted = Array.from(statistics);
  return {
    low: sortedQuantile(sorted, 0.025),
    high: sortedQuantile(sorted, 0.975),
  };
}

export function rankSumPValue(
  a: readonly number[],
  b: readonly number[]
): number {
  const doubledRanks = doubledMidRanks([...a, ...b]);
  const smaller =
    a.length <= b.length
      ? doubledRanks.slice(0, a.length)
      : doubledRanks.slice(a.length);
  const expectedSum = smaller.length * (doubledRanks.length + 1);
  const observedDeviation = Math.abs(sum(smaller) - expectedSum);
  const counts = subsetSumCounts(doubledRanks, smaller.length);
  let extreme = 0n;
  let splits = 0n;
  counts.forEach((count, rankSum) => {
    splits += count;
    if (Math.abs(rankSum - expectedSum) >= observedDeviation) {
      extreme += count;
    }
  });
  return Number(extreme) / Number(splits);
}

export function splitDifferenceQuantile(
  a: readonly number[],
  b: readonly number[],
  comparison: Comparison,
  q: number
): number | null {
  if (a.length === 0 || b.length === 0) {
    return null;
  }
  const pool = [...a, ...b].sort((left, right) => left - right);
  const smallestFirstMedian = sortedQuantile(pool.slice(0, a.length), 0.5);
  if (comparison === 'relative' && !(smallestFirstMedian > 0)) {
    return null;
  }
  const differences: number[] = [];
  for (const inFirstGroup of splitsOf(pool.length, a.length)) {
    const first = pool.filter((_, i) => inFirstGroup[i]);
    const second = pool.filter((_, i) => !inFirstGroup[i]);
    differences.push(
      Math.abs(
        difference(
          sortedQuantile(first, 0.5),
          sortedQuantile(second, 0.5),
          comparison
        )
      )
    );
  }
  return quantile(differences, q);
}

export function benjaminiHochberg(
  pValues: readonly number[],
  alpha = 0.05
): boolean[] {
  const order = pValues
    .map((pValue, index) => ({ pValue, index }))
    .sort((left, right) => left.pValue - right.pValue);
  let passingRank = 0;
  order.forEach(({ pValue }, i) => {
    if (pValue <= ((i + 1) / order.length) * alpha) {
      passingRank = i + 1;
    }
  });
  const passes = new Array<boolean>(pValues.length).fill(false);
  order.slice(0, passingRank).forEach(({ index }) => {
    passes[index] = true;
  });
  return passes;
}

export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sortedQuantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  const position = (sorted.length - 1) * q;
  const lower = sorted[Math.floor(position)];
  const upper = sorted[Math.ceil(position)];
  if (lower === upper) {
    return lower;
  }
  return lower + (upper - lower) * (position - Math.floor(position));
}

function byValue(left: number, right: number): number {
  return left - right;
}

function resample(values: readonly number[], random: () => number): number[] {
  return values.map(() => values[Math.floor(random() * values.length)]);
}

function doubledMidRanks(values: readonly number[]): number[] {
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const ranks = new Array<number>(values.length);
  let first = 0;
  while (first < order.length) {
    let last = first;
    while (
      last + 1 < order.length &&
      order[last + 1].value === order[first].value
    ) {
      last++;
    }
    for (let i = first; i <= last; i++) {
      ranks[order[i].index] = first + last + 2;
    }
    first = last + 1;
  }
  return ranks;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function subsetSumCounts(values: readonly number[], size: number): bigint[] {
  const counts = Array.from({ length: size + 1 }, () =>
    new Array<bigint>(sum(values) + 1).fill(0n)
  );
  counts[0][0] = 1n;
  let reachedSum = 0;
  for (const value of values) {
    reachedSum += value;
    for (let chosen = size; chosen >= 1; chosen--) {
      const withValue = counts[chosen];
      const withoutValue = counts[chosen - 1];
      for (let total = reachedSum; total >= value; total--) {
        withValue[total] += withoutValue[total - value];
      }
    }
  }
  return counts[size];
}

function splitsOf(count: number, firstSize: number): Iterable<boolean[]> {
  return binomial(count, firstSize) <= EXACT_SPLITS_LIMIT
    ? allSplits(count, firstSize)
    : randomSplits(count, firstSize, RANDOM_SPLITS);
}

function binomial(count: number, chosen: number): number {
  let result = 1;
  for (let i = 1; i <= chosen; i++) {
    result = (result * (count - chosen + i)) / i;
  }
  return Math.round(result);
}

function* allSplits(count: number, firstSize: number): Generator<boolean[]> {
  const indices = Array.from({ length: firstSize }, (_, i) => i);
  while (true) {
    yield membership(indices, count);
    let i = firstSize - 1;
    while (i >= 0 && indices[i] === count - firstSize + i) {
      i--;
    }
    if (i < 0) {
      return;
    }
    indices[i]++;
    for (let j = i + 1; j < firstSize; j++) {
      indices[j] = indices[j - 1] + 1;
    }
  }
}

function* randomSplits(
  count: number,
  firstSize: number,
  options: ResamplingOptions
): Generator<boolean[]> {
  const random = createRandom(options.seed);
  const order = Array.from({ length: count }, (_, i) => i);
  for (let split = 0; split < options.iterations; split++) {
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    yield membership(order.slice(0, firstSize), count);
  }
}

function membership(indices: readonly number[], count: number): boolean[] {
  const members = new Array<boolean>(count).fill(false);
  indices.forEach((index) => {
    members[index] = true;
  });
  return members;
}
