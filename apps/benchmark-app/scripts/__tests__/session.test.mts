import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SampleMetrics } from '../metrics.mts';
import type { InvalidCause } from '../protocol.mts';
import { blockOrder, runScenario } from '../session.mts';
import type { MeasuredSample, SamplePlace } from '../session.mts';

function sampler(
  invalidAt: (place: SamplePlace, count: number) => InvalidCause | null
) {
  const places: SamplePlace[] = [];
  const take = async (place: SamplePlace): Promise<MeasuredSample> => {
    places.push(place);
    const cause = invalidAt(place, places.length);
    const common = { ...place, batteryLevel: 90, timings: {} };
    return cause
      ? { ...common, valid: false, cause, detail: `${cause} detail` }
      : {
          ...common,
          valid: true,
          metrics: { uiThreadCpu: places.length } as SampleMetrics,
        };
  };
  return { take, places };
}

describe('blockOrder', () => {
  it('gives ABBA for even blocks and BAAB for odd blocks', () => {
    assert.deepEqual(blockOrder(0), ['a', 'b', 'b', 'a']);
    assert.deepEqual(blockOrder(1), ['b', 'a', 'a', 'b']);
    assert.deepEqual(blockOrder(4), ['a', 'b', 'b', 'a']);
  });
});

describe('runScenario', () => {
  it('takes two samples of each variant in each block', async () => {
    const { take, places } = sampler(() => null);
    const outcome = await runScenario('css', 2, take);
    assert.equal(outcome.failed, null);
    assert.deepEqual(places.map((place) => place.variant).join(''), 'abbabaab');
    assert.ok(outcome.samples.every((sample) => sample.accepted));
  });

  it('runs a block again after an invalid sample and keeps the discarded samples', async () => {
    const { take, places } = sampler((_place, count) =>
      count === 3 ? 'frames' : null
    );
    const outcome = await runScenario('css', 1, take);
    assert.equal(outcome.failed, null);
    assert.equal(places.length, 7);
    assert.deepEqual(
      outcome.samples.map((sample) => [
        sample.attempt,
        sample.valid,
        sample.accepted,
      ]),
      [
        [0, true, false],
        [0, true, false],
        [0, false, false],
        [1, true, true],
        [1, true, true],
        [1, true, true],
        [1, true, true],
      ]
    );
  });

  it('gives the samples to the progress listener after each sample', async () => {
    const { take } = sampler((_place, count) =>
      count === 2 ? 'thermal' : null
    );
    const progress: [number, boolean | null][] = [];
    const outcome = await runScenario('css', 1, take, (snapshot) =>
      progress.push([snapshot.samples.length, snapshot.failed === null])
    );
    assert.deepEqual(
      progress.map(([count]) => count),
      [1, 2, 3, 4, 5, 6]
    );
    assert.ok(progress.every(([, notFailed]) => notFailed));
    assert.equal(outcome.samples.length, 6);
  });

  it('fails the scenario after 3 invalid blocks in sequence', async () => {
    const { take } = sampler((place) => {
      if (place.block !== 1) {
        return null;
      }
      return place.variant === 'b' ? 'crash' : null;
    });
    const outcome = await runScenario('css', 3, take);
    assert.deepEqual(outcome.failed, {
      scenario: 'css',
      variants: ['b'],
      causes: [0, 1, 2].map(() => ({
        variant: 'b',
        cause: 'crash',
        detail: 'crash detail',
      })),
    });
    assert.equal(outcome.samples.filter((sample) => sample.accepted).length, 4);
    assert.ok(!outcome.samples.some((sample) => sample.block === 2));
  });
});
