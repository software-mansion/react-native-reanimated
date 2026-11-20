import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SampleMetrics } from '../metrics.mts';
import type { InvalidCause } from '../samples.mts';
import { balancedOrder, runScenario } from '../session.mts';
import type {
  Measured,
  ProgressListener,
  Recorded,
  SamplePlace,
  Sampler,
} from '../session.mts';

function sampler(
  invalidAt: (place: SamplePlace, count: number) => InvalidCause | null
) {
  const places: SamplePlace[] = [];
  const take = async (place: SamplePlace): Promise<Measured> => {
    places.push(place);
    const cause = invalidAt(place, places.length);
    const common = { ...place, segment: 0, batteryLevel: 90, timings: {} };
    return cause
      ? { ...common, valid: false, cause, detail: `${cause} detail` }
      : {
          ...common,
          valid: true,
          report: { version: 1, load: 10, jsThread: 5 },
          metrics: { uiThreadCpu: places.length } as SampleMetrics,
        };
  };
  return { take, places };
}

function scenario(
  rounds: number,
  sampler: Sampler<Measured>,
  onProgress: ProgressListener<Measured> = () => {},
  acceptedSamples: Recorded[] = []
) {
  return runScenario({
    scenario: 'css',
    rounds,
    orderOf: balancedOrder,
    sampler,
    onProgress,
    acceptedSamples,
  });
}

describe('balancedOrder', () => {
  it('gives ABBA for even rounds and BAAB for odd rounds', () => {
    assert.deepEqual(balancedOrder(0), ['a', 'b', 'b', 'a']);
    assert.deepEqual(balancedOrder(1), ['b', 'a', 'a', 'b']);
    assert.deepEqual(balancedOrder(4), ['a', 'b', 'b', 'a']);
  });
});

describe('runScenario', () => {
  it('takes two samples of each variant in each round', async () => {
    const { take, places } = sampler(() => null);
    const outcome = await scenario(2, take);
    assert.equal(outcome.failed, null);
    assert.deepEqual(places.map((place) => place.variant).join(''), 'abbabaab');
    assert.ok(outcome.samples.every((sample) => sample.accepted));
  });

  it('runs a round again after an invalid sample and keeps the discarded samples', async () => {
    const { take, places } = sampler((_place, count) =>
      count === 3 ? 'frames' : null
    );
    const outcome = await scenario(1, take);
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

  it('gives the samples to the progress listener after each sample and each accepted round', async () => {
    const { take } = sampler((_place, count) =>
      count === 2 ? 'thermal' : null
    );
    const progress: [number, boolean | null][] = [];
    const outcome = await scenario(1, take, (snapshot) =>
      progress.push([snapshot.samples.length, snapshot.failed === null])
    );
    assert.deepEqual(
      progress.map(([count]) => count),
      [1, 2, 3, 4, 5, 6, 6]
    );
    assert.ok(progress.every(([, notFailed]) => notFailed));
    assert.equal(outcome.samples.length, 6);
  });

  it('reports a round as accepted before the next sample starts', async () => {
    const reports: string[] = [];
    await scenario(1, sampler(() => null).take, (progress) =>
      reports.push(
        JSON.stringify(progress.samples.map((sample) => sample.accepted))
      )
    );
    assert.equal(reports.at(-1), '[true,true,true,true]');
  });

  it('continues after the accepted rounds of a stopped scenario', async () => {
    const first = await scenario(1, sampler(() => null).take);
    const { take, places } = sampler(() => null);
    const outcome = await scenario(2, take, undefined, first.samples);
    assert.equal(outcome.failed, null);
    assert.deepEqual(
      places.map((place) => [place.round, place.attempt, place.variant]),
      [
        [1, 0, 'b'],
        [1, 0, 'a'],
        [1, 0, 'a'],
        [1, 0, 'b'],
      ]
    );
    assert.deepEqual(
      outcome.samples.map((sample) => [sample.round, sample.accepted]),
      [0, 0, 0, 0, 1, 1, 1, 1].map((round) => [round, true])
    );
  });

  it('fails the scenario after 3 invalid rounds in sequence', async () => {
    const { take } = sampler((place) => {
      if (place.round !== 1) {
        return null;
      }
      return place.variant === 'b' ? 'crash' : null;
    });
    const outcome = await scenario(3, take);
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
    assert.ok(!outcome.samples.some((sample) => sample.round === 2));
  });
});
