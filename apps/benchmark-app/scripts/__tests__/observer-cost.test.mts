import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BLOCK_ORDER, observerCosts } from '../observer-cost.mts';
import type { CollectorSample, ObserverCost } from '../observer-cost.mts';

const LIMITS = { uiThreadCpu: 0.08, jsThreadCpu: 0.08, memory: 0.08 };

function samples(
  costOfBlock: (block: number) => number,
  blocks = 5
): CollectorSample[] {
  return Array.from({ length: blocks }, (_, i) => i + 1).flatMap((block) =>
    BLOCK_ORDER.map((collector, i) => {
      const base = 100 + block + i * 0.1;
      const factor = collector === 'full' ? costOfBlock(block) : 1;
      return {
        block,
        collector,
        uiThreadCpu: base * factor,
        jsThreadCpu: 2 * factor,
        otherThreadsCpu: 1,
        processCpu: (base + 3) * factor,
        memory: 40_000 * factor,
        windowSeconds: 10,
      };
    })
  );
}

function costOf(costs: ObserverCost[], metric: ObserverCost['metric']) {
  const cost = costs.find((candidate) => candidate.metric === metric);
  assert.ok(cost, `no cost of ${metric}`);
  return cost;
}

describe('observerCosts', () => {
  it('orders each block as enabled, disabled, disabled, enabled', () => {
    assert.deepEqual(BLOCK_ORDER, ['full', 'endpoints', 'endpoints', 'full']);
  });

  it('gives the cost of the CPU metrics and of the end-point footprint', () => {
    const costs = observerCosts(
      samples(() => 1.01),
      LIMITS
    );
    assert.deepEqual(
      costs.map((cost) => cost.metric),
      ['uiThreadCpu', 'jsThreadCpu', 'processCpu', 'memory']
    );
    const memory = costOf(costs, 'memory');
    assert.equal(memory.medianEndpoints, 40_000);
    assert.equal(memory.medianFull, 40_400);
    assert.equal(memory.allowed, 0.02);
    assert.equal(memory.outcome, 'passed');
  });

  it('passes a metric only when the interval is inside one quarter of its noise limit', () => {
    const js = costOf(
      observerCosts(
        samples(() => 1.01),
        LIMITS
      ),
      'jsThreadCpu'
    );
    assert.ok(Math.abs(js.relativeDifference - 0.01) < 1e-9);
    assert.equal(js.allowed, 0.02);
    assert.equal(js.outcome, 'passed');
    assert.equal(
      costOf(
        observerCosts(
          samples(() => 1.03),
          LIMITS
        ),
        'jsThreadCpu'
      ).outcome,
      'failed'
    );
  });

  it('does not validate a metric without a noise limit or with too few blocks', () => {
    const costs = observerCosts(
      samples(() => 1),
      {}
    );
    assert.ok(costs.every((cost) => cost.outcome === 'not validated'));
    assert.equal(costOf(costs, 'uiThreadCpu').allowed, null);
    const four = observerCosts(
      samples(() => 1, 4),
      LIMITS
    );
    assert.equal(costOf(four, 'jsThreadCpu').blocks, 4);
    assert.equal(costOf(four, 'jsThreadCpu').outcome, 'not validated');
  });

  it('draws whole blocks, so a cost that changes between blocks gives an interval that crosses a bound', () => {
    const steady = costOf(
      observerCosts(
        samples(() => 1.01),
        LIMITS
      ),
      'jsThreadCpu'
    );
    assert.ok(Math.abs(steady.interval.high - steady.interval.low) < 1e-12);
    assert.equal(steady.outcome, 'passed');
    const changing = costOf(
      observerCosts(
        samples((block) => [1, 1.005, 1.01, 1.015, 1.08][block - 1]),
        LIMITS
      ),
      'jsThreadCpu'
    );
    assert.ok(changing.interval.low >= -0.02);
    assert.ok(changing.interval.high > 0.02);
    assert.equal(changing.outcome, 'not validated');
  });
});
