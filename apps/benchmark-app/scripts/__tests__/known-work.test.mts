import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SampledEpoch } from '../in-app-sample.mts';
import {
  KNOWN_WORK_INSTRUCTIONS_PER_UNIT,
  KNOWN_WORK_UNITS,
  deriveKnownWork,
} from '../known-work.mts';
import {
  knownWorkBoundaries,
  knownWorkEpochs,
} from './validation-fixtures.mts';

function derive(
  epochs: SampledEpoch[] = knownWorkEpochs(),
  extraInstructions?: (load: string) => number
) {
  return deriveKnownWork({
    cpuCount: 6,
    reportedThermalState: 0,
    appBoundaries: knownWorkBoundaries(extraInstructions),
    epochs,
  });
}

function outcomes(epochs?: SampledEpoch[], extra?: (load: string) => number) {
  return Object.fromEntries(
    derive(epochs, extra).gates.map((gate) => [gate.name, gate.passes])
  );
}

describe('deriveKnownWork', () => {
  it('takes the instructions of a load as its epoch minus the mean rate of the idle epochs around it', () => {
    const derivation = derive(undefined, (load) =>
      load === 'idle' ? 0 : 1_000
    );
    const single = derivation.epochs.find(({ load }) => load === 'known-work');
    assert.equal(
      single?.loadInstructions,
      KNOWN_WORK_UNITS * KNOWN_WORK_INSTRUCTIONS_PER_UNIT + 1_000
    );
    assert.equal(
      derivation.epochs.find(({ load }) => load === 'idle')?.loadInstructions,
      null
    );
    assert.ok(derivation.gates.every((gate) => gate.passes));
  });

  it('fails the unit gates when a load did not count its planned units or an epoch counted units of another load', () => {
    const epochs = knownWorkEpochs().map((epoch) =>
      epoch.load === 'known-work-double'
        ? { ...epoch, work: { own: 1_999, other: 0 } }
        : epoch.load === 'idle'
          ? { ...epoch, work: { own: 0, other: 1 } }
          : epoch
    );
    const gates = outcomes(epochs);
    assert.equal(gates['`known-work-double` ran its planned units'], false);
    assert.equal(gates['`known-work` ran its planned units'], true);
    assert.equal(gates['no epoch counted units of another load'], false);
  });

  it('fails the linearity gate outside the tolerance and passes it inside', () => {
    const offBy = (fraction: number) => (load: string) =>
      load === 'known-work-double'
        ? fraction * 2 * KNOWN_WORK_UNITS * KNOWN_WORK_INSTRUCTIONS_PER_UNIT
        : 0;
    const linearity = '`known-work-double` against `known-work` (linearity)';
    assert.equal(outcomes(undefined, offBy(0.009))[linearity], true);
    assert.equal(outcomes(undefined, offBy(0.011))[linearity], false);
  });

  it('is a tool error when a load epoch has no idle epoch before or after it', () => {
    const epochs = knownWorkEpochs().map((epoch, index) =>
      index === 2 ? { ...epoch, load: 'known-work-ended' } : epoch
    );
    assert.throws(
      () => derive(epochs),
      /The known-work epoch 1 needs an idle epoch before and after it/
    );
  });
});
