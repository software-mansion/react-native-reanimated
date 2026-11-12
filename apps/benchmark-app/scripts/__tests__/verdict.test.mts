import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { VerdictMetric } from '../metrics.mts';
import type { Scenario } from '../scenarios.mts';
import { computeVerdictRows } from '../verdict.mts';
import type { VerdictRow } from '../verdict.mts';

const BASE = [100, 102, 98, 101, 99, 100, 103, 97, 100, 101];

function valuesFrom(
  table: Partial<Record<VerdictMetric, { a: number[]; b: number[] }>>
) {
  return (_scenario: Scenario, metric: VerdictMetric, variant: 'a' | 'b') =>
    table[metric]?.[variant] ?? BASE;
}

function rowOf(rows: VerdictRow[], metric: VerdictMetric): VerdictRow {
  const row = rows.find((candidate) => candidate.metric === metric);
  assert.ok(row, metric);
  return row;
}

function assertFiniteRow(row: VerdictRow) {
  for (const value of [
    row.medianA,
    row.medianB,
    row.difference,
    row.interval.low,
    row.interval.high,
    row.pValue,
  ]) {
    assert.ok(Number.isFinite(value), `${row.metric}: ${value}`);
  }
}

describe('computeVerdictRows', () => {
  it('gives one row for each verdict metric of each scenario', () => {
    const rows = computeVerdictRows(
      ['css', 'mount-unmount'],
      valuesFrom({}),
      {}
    );
    assert.equal(rows.filter((row) => row.scenario === 'css').length, 7);
    assert.equal(
      rows.filter((row) => row.scenario === 'mount-unmount').length,
      8
    );
    assert.ok(rows.every((row) => row.verdict === 'no change found'));
  });

  it('finds a clear improvement and a clear regression', () => {
    const rows = computeVerdictRows(
      ['css'],
      valuesFrom({
        uiThreadCpu: { a: BASE, b: BASE.map((value) => value * 0.7) },
        coldStart: { a: BASE, b: BASE.map((value) => value * 1.3) },
      }),
      {}
    );
    assert.equal(rowOf(rows, 'uiThreadCpu').verdict, 'better');
    assert.equal(rowOf(rows, 'coldStart').verdict, 'worse');
    assert.equal(rowOf(rows, 'memory').verdict, 'no change found');
  });

  it('gives no change found when the difference is inside the noise limit', () => {
    const rows = computeVerdictRows(
      ['css'],
      valuesFrom({
        uiThreadCpu: { a: BASE, b: BASE.map((value) => value * 0.7) },
      }),
      { css: { uiThreadCpu: 0.4 } }
    );
    const row = rowOf(rows, 'uiThreadCpu');
    assert.equal(row.comparison, 'relative');
    assert.equal(row.noiseLimit, 0.4);
    assert.equal(row.verdict, 'no change found');
  });

  it('compares memoryGrowth as an absolute difference with a noise limit in kB', () => {
    const growthA = BASE.map((value) => value * 10);
    const growthB = growthA.map((value) => value + 300);
    const values = valuesFrom({ memoryGrowth: { a: growthA, b: growthB } });
    const inside = rowOf(
      computeVerdictRows(['mount-unmount'], values, {
        'mount-unmount': { memoryGrowth: 400 },
      }),
      'memoryGrowth'
    );
    assert.equal(inside.comparison, 'absolute');
    assert.equal(inside.comparisonFallback, false);
    assert.equal(inside.difference, 300);
    assert.equal(inside.noiseLimit, 400);
    assert.equal(inside.verdict, 'no change found');
    const outside = rowOf(
      computeVerdictRows(['mount-unmount'], values, {
        'mount-unmount': { memoryGrowth: 200 },
      }),
      'memoryGrowth'
    );
    assert.equal(outside.verdict, 'worse');
  });

  it('does not reverse the verdict for negative memory growth', () => {
    const a = Array.from({ length: 10 }, (_, i) => -100 - i);
    const b = Array.from({ length: 10 }, (_, i) => -200 - i);
    const rows = computeVerdictRows(
      ['mount-unmount'],
      valuesFrom({ memoryGrowth: { a, b }, memory: { a, b } }),
      {}
    );
    const growth = rowOf(rows, 'memoryGrowth');
    assert.equal(growth.difference, -100);
    assert.equal(growth.verdict, 'better');
    const memory = rowOf(rows, 'memory');
    assert.equal(memory.comparisonFallback, true);
    assert.notEqual(memory.verdict, 'worse');
  });

  it('falls back to the absolute difference when a bootstrap draw has a median of A of 0', () => {
    const rows = computeVerdictRows(
      ['css'],
      valuesFrom({
        jankyFrames: {
          a: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
          b: [0, 0, 0, 0, 2, 2, 2, 2, 2, 2],
        },
      }),
      { css: { jankyFrames: 0.01 } }
    );
    const janky = rowOf(rows, 'jankyFrames');
    assert.equal(janky.medianA, 1);
    assert.equal(janky.comparison, 'absolute');
    assert.equal(janky.comparisonFallback, true);
    assert.equal(janky.difference, 1);
    assert.equal(janky.noiseLimit, 0.01);
    rows.forEach(assertFiniteRow);
  });

  it('scales the relative noise limit by the median of A for a fallback row', () => {
    const values = valuesFrom({
      jankyFrames: {
        a: [0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
        b: BASE.map(() => 11),
      },
    });
    const limited = rowOf(
      computeVerdictRows(['css'], values, { css: { jankyFrames: 0.5 } }),
      'jankyFrames'
    );
    assert.equal(limited.comparisonFallback, true);
    assert.equal(limited.difference, 1);
    assert.equal(limited.noiseLimit, 5);
    assert.equal(limited.verdict, 'no change found');
    const unlimited = rowOf(
      computeVerdictRows(['css'], values, { css: { jankyFrames: 0.05 } }),
      'jankyFrames'
    );
    assert.equal(unlimited.noiseLimit, 0.5);
    assert.equal(unlimited.verdict, 'worse');
  });

  it('uses the absolute difference when the median of A is 0', () => {
    const rows = computeVerdictRows(
      ['css'],
      valuesFrom({
        jankyFrames: {
          a: [0, 0, 0, 0, 0, 0, 0.001, 0.002, 0.003, 0.004],
          b: BASE.map((value) => value / 1000),
        },
      }),
      { css: { jankyFrames: 0.5 } }
    );
    const janky = rowOf(rows, 'jankyFrames');
    assert.equal(janky.comparison, 'absolute');
    assert.equal(janky.comparisonFallback, true);
    assert.equal(janky.difference, 0.1);
    assert.ok(janky.pValue < 0.05 / 7);
    assert.equal(janky.noiseLimit, null);
    assert.equal(janky.verdict, 'worse');
  });

  it('gives no change found when both medians are 0', () => {
    const zeros = BASE.map(() => 0);
    const rows = computeVerdictRows(
      ['css'],
      valuesFrom({ jankyFrames: { a: zeros, b: zeros } }),
      {}
    );
    assert.equal(rowOf(rows, 'jankyFrames').verdict, 'no change found');
  });

  it('stops with a tool error instead of a number that is not finite', () => {
    assert.throws(
      () =>
        computeVerdictRows(
          ['css'],
          valuesFrom({ coldStart: { a: [], b: BASE } }),
          {}
        ),
      /statistics of css, coldStart are not finite numbers/
    );
  });
});
