import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ciConfig } from '../ci-config.mts';
import type { CiInputs } from '../ci-config.mts';
import { validateConfig } from '../config.mts';
import { PLATFORM_DEFINITIONS } from '../definitions.mts';
import { SCENARIOS } from '../scenarios.mts';

const INPUTS: CiInputs = {
  platform: 'android',
  a: { reanimated: '4.7.1', worklets: '' },
  b: { reanimated: '4.7.1', worklets: '0.13.0' },
  scenarios: 'all',
  sharedElementTransitions: false,
  checkoutSha: '877986b3da',
  tarballsDir: '/work/tarballs',
};

function configOf(overrides: Partial<CiInputs> = {}) {
  return ciConfig({ ...INPUTS, ...overrides }, (reanimated) =>
    reanimated === '4.7.1' ? '0.13.1' : assert.fail(reanimated)
  );
}

function validFor(config: ReturnType<typeof ciConfig>) {
  return validateConfig(
    config,
    '/work',
    { isFile: () => true },
    PLATFORM_DEFINITIONS.android
  );
}

describe('ciConfig', () => {
  it('selects all scenarios that need no flag by default and sets no flag', () => {
    const config = configOf();
    assert.deepEqual(
      config.scenarios,
      SCENARIOS.filter((scenario) => scenario !== 'shared-elements')
    );
    assert.deepEqual(config.a, { reanimated: '4.7.1', worklets: '0.13.1' });
    assert.deepEqual(config.b, { reanimated: '4.7.1', worklets: '0.13.0' });
    assert.doesNotThrow(() => validFor(config));
  });

  it('turns on shared element transitions in both variants and then selects all scenarios', () => {
    const config = configOf({ sharedElementTransitions: true });
    assert.deepEqual(config.scenarios, [...SCENARIOS]);
    for (const variant of [config.a, config.b]) {
      assert.deepEqual(variant.reanimatedFlags, {
        ENABLE_SHARED_ELEMENT_TRANSITIONS: true,
      });
    }
    assert.doesNotThrow(() => validFor(config));
  });

  it('keeps a named scenario list, and the driver refuses shared-elements without the flag', () => {
    const named = configOf({ scenarios: ' css, idle-cost ' });
    assert.deepEqual(named.scenarios, ['css', 'idle-cost']);
    const sharedElements = configOf({ scenarios: 'shared-elements' });
    assert.deepEqual(sharedElements.scenarios, ['shared-elements']);
    assert.throws(
      () => validFor(sharedElements),
      /config\.a\.reanimatedFlags\.ENABLE_SHARED_ELEMENT_TRANSITIONS must be true/
    );
    assert.doesNotThrow(() =>
      validFor(
        configOf({
          scenarios: 'shared-elements',
          sharedElementTransitions: true,
        })
      )
    );
  });

  it('packs checkout on one side and names its commit in the note', () => {
    const config = configOf({ b: { reanimated: 'checkout', worklets: '' } });
    assert.equal(config.name, 'android-4.7.1-vs-checkout');
    assert.deepEqual(config.a, { reanimated: '4.7.1', worklets: '0.13.1' });
    assert.deepEqual(config.b, {
      reanimated: '/work/tarballs/react-native-reanimated.tgz',
      worklets: '/work/tarballs/react-native-worklets.tgz',
    });
    assert.equal(
      config.note,
      'A: Reanimated 4.7.1. B: Reanimated checkout. checkout is the commit 877986b3da that the workflow checked out.'
    );
  });

  it('uses the Worklets of checkout for a published Reanimated when asked', () => {
    const config = configOf({
      a: { reanimated: '4.7.1', worklets: 'checkout' },
    });
    assert.equal(config.a.worklets, '/work/tarballs/react-native-worklets.tgz');
  });
});
