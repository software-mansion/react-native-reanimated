import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BLOCK_ORDER, observerCosts } from '../observer-cost.mts';
import type { CollectorSample } from '../observer-cost.mts';

function samples(fullFactor: number): CollectorSample[] {
  return [1, 2, 3, 4, 5].flatMap((block) =>
    BLOCK_ORDER.map((collector, i) => {
      const base = 100 + block + i * 0.1;
      const factor = collector === 'full' ? fullFactor : 1;
      return {
        block,
        collector,
        uiThreadCpu: base * factor,
        jsThreadCpu: 2 * factor,
        otherThreadsCpu: 1,
        processCpu: (base + 3) * factor,
        windowSeconds: 10,
      };
    })
  );
}

describe('observerCosts', () => {
  it('orders each block as enabled, disabled, disabled, enabled', () => {
    assert.deepEqual(BLOCK_ORDER, ['full', 'endpoints', 'endpoints', 'full']);
  });

  it('gives the relative difference of the medians and its interval, and no gate without a noise limit', () => {
    const [ui, js, process] = observerCosts(samples(1), {});
    assert.equal(ui.metric, 'uiThreadCpu');
    assert.ok(Math.abs(ui.relativeDifference) < 0.01);
    assert.ok(ui.interval.low <= 0 && ui.interval.high >= 0);
    assert.equal(ui.within, null);
    assert.deepEqual(js.interval, { low: 0, high: 0 });
    assert.equal(process.metric, 'processCpu');
  });

  it('passes when the interval is inside one quarter of the noise limit', () => {
    const [, js] = observerCosts(samples(1.01), { jsThreadCpu: 0.08 });
    assert.ok(Math.abs(js.relativeDifference - 0.01) < 1e-9);
    assert.equal(js.allowed, 0.02);
    assert.equal(js.within, true);
    const [, slower] = observerCosts(samples(1.03), { jsThreadCpu: 0.08 });
    assert.equal(slower.within, false);
  });
});
