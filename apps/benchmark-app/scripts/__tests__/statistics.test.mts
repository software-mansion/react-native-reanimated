import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  benjaminiHochberg,
  bootstrapDraws,
  bootstrapInterval,
  createRandom,
  median,
  quantile,
  rankSumPValue,
  splitDifferenceQuantile,
} from '../statistics.mts';

const Q = 0.975;

describe('median and quantile', () => {
  it('takes the middle value or the mean of the two middle values', () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([4, 1, 3, 2]), 2.5);
  });

  it('interpolates between the closest ranks', () => {
    assert.equal(quantile([1, 2, 3, 4, 5], 0.95), 4.8);
    assert.equal(quantile([10], 0.95), 10);
  });

  it('gives NaN for no values', () => {
    assert.ok(Number.isNaN(median([])));
  });
});

describe('createRandom', () => {
  it('gives the same sequence for the same seed', () => {
    const first = createRandom(7);
    const second = createRandom(7);
    const values = Array.from({ length: 5 }, () => first());
    assert.deepEqual(
      values,
      Array.from({ length: 5 }, () => second())
    );
    assert.ok(values.every((value) => value >= 0 && value < 1));
  });
});

describe('bootstrapInterval', () => {
  const a = [100, 102, 98, 101, 99, 100, 103, 97, 100, 101];
  const b = a.map((value) => value * 0.7);

  it('gives an interval around a clear relative difference', () => {
    const interval = bootstrapInterval(bootstrapDraws(a, b), 'relative');
    assert.ok(interval.low < -0.25 && interval.high > -0.35);
    assert.ok(interval.high < 0);
  });

  it('gives the same draws and interval each time', () => {
    assert.deepEqual(bootstrapDraws(a, b), bootstrapDraws(a, b));
    assert.deepEqual(
      bootstrapInterval(bootstrapDraws(a, b), 'relative'),
      bootstrapInterval(bootstrapDraws(a, b), 'relative')
    );
  });

  it('includes zero when the samples are equal', () => {
    const interval = bootstrapInterval(
      bootstrapDraws(a, [...a].reverse()),
      'relative'
    );
    assert.ok(interval.low <= 0 && interval.high >= 0);
  });

  it('gives an absolute interval', () => {
    const interval = bootstrapInterval(
      bootstrapDraws([0, 0, 0, 0], [2, 2, 2, 2]),
      'absolute'
    );
    assert.deepEqual(interval, { low: 2, high: 2 });
  });

  it('keeps all draws, also draws with a median of A of 0', () => {
    const draws = bootstrapDraws(
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 2, 2, 2, 2, 2, 2]
    );
    assert.equal(draws.mediansA.length, 10000);
    assert.ok(draws.mediansA.some((value) => value === 0));
  });
});

describe('rankSumPValue', () => {
  const ten = (first: number) =>
    Array.from({ length: 10 }, (_, i) => first + i);

  it('gives the exact p-value for fully separated groups', () => {
    assert.equal(rankSumPValue([1, 2, 3, 4], [5, 6, 7, 8]), 2 / 70);
    assert.equal(rankSumPValue(ten(0), ten(100)), 2 / 184756);
    assert.equal(rankSumPValue(ten(100), ten(0)), 2 / 184756);
  });

  it('gives mid-ranks to ties', () => {
    const lower = Array.from({ length: 10 }, () => 3);
    const higher = Array.from({ length: 10 }, () => 7);
    assert.equal(rankSumPValue(lower, higher), 2 / 184756);
  });

  it('gives 1 for equal groups', () => {
    assert.equal(rankSumPValue([1, 1, 1], [1, 1, 1]), 1);
  });

  it('does not depend on the size of the difference', () => {
    assert.equal(
      rankSumPValue(ten(0), ten(100)),
      rankSumPValue(ten(0), ten(10))
    );
  });

  it('gives the exact p-value for 12 against 12 samples and more', () => {
    const twelve = (first: number) =>
      Array.from({ length: 12 }, (_, i) => first + i);
    assert.equal(rankSumPValue(twelve(0), twelve(100)), 2 / 2704156);
    assert.equal(rankSumPValue(twelve(100), twelve(0)), 2 / 2704156);
  });

  it('gives the same p-value for groups of different sizes in either order', () => {
    const a = [1, 4, 4, 9, 12];
    const b = [2, 3, 5, 6, 7, 8, 10, 11, 13, 14, 15];
    assert.equal(rankSumPValue(a, b), rankSumPValue(b, a));
  });
});

describe('benjaminiHochberg', () => {
  it('passes the rows up to the largest rank under the line', () => {
    assert.deepEqual(benjaminiHochberg([0.01, 0.03, 0.02, 0.2], 0.05), [
      true,
      true,
      true,
      false,
    ]);
    assert.deepEqual(benjaminiHochberg([0.01, 0.04, 0.03, 0.2], 0.05), [
      true,
      false,
      false,
      false,
    ]);
  });

  it('passes no row when no p-value is under the line', () => {
    assert.deepEqual(benjaminiHochberg([0.2, 0.5], 0.05), [false, false]);
  });

  it('passes an earlier rank because a later rank is under the line', () => {
    assert.deepEqual(benjaminiHochberg([0.026, 0.05], 0.05), [true, true]);
  });
});

describe('splitDifferenceQuantile', () => {
  it('takes the 97.5th percentile of the absolute difference over all splits', () => {
    assert.equal(splitDifferenceQuantile([1, 2], [3, 4], 'absolute', Q), 2);
    assert.ok(
      Math.abs(
        (splitDifferenceQuantile([1, 2], [3, 4], 'relative', Q) ?? 0) - 26 / 21
      ) < 1e-12
    );
  });

  it('gives no limit when the relative difference is not defined', () => {
    assert.equal(
      splitDifferenceQuantile([0, 0, 1], [1, 1, 1], 'relative', Q),
      null
    );
    assert.equal(
      splitDifferenceQuantile([0, 0, 1], [1, 1, 1], 'absolute', Q),
      1
    );
  });

  it('gives no limit with random splits when one split has no relative difference', () => {
    const zeros = new Array<number>(21).fill(0);
    const ones = new Array<number>(19).fill(1);
    const b = new Array<number>(40).fill(1);
    assert.equal(
      splitDifferenceQuantile([...zeros, ...ones], b, 'relative', Q),
      null
    );
  });

  it('gives the same limit each time with random splits', () => {
    const a = Array.from({ length: 20 }, (_, i) => 100 + i);
    const b = a.map((value) => value + 0.5);
    const limit = splitDifferenceQuantile(a, b, 'relative', Q);
    assert.equal(splitDifferenceQuantile(a, b, 'relative', Q), limit);
    assert.ok(limit !== null && limit > 0 && limit < 0.1);
  });
});
