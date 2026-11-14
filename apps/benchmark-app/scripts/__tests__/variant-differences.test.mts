import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { VariantsConfig, Variant } from '../config.mts';
import type { BuiltVariant } from '../variant-build.mts';
import { variantDifferences } from '../variant-differences.mts';

const VARIANT: Variant = {
  reanimated: { kind: 'npm', version: '4.7.1' },
  worklets: { kind: 'npm', version: '0.13.1' },
  reanimatedFlags: {},
  workletsFlags: {},
  bundleMode: false,
  profiling: false,
};

const CONFIG: VariantsConfig = { name: 'compare', a: VARIANT, b: VARIANT };

function built(
  variant: 'a' | 'b',
  overrides: Partial<BuiltVariant> = {}
): BuiltVariant {
  return {
    variant,
    buildKey: `key-${variant}`,
    directory: `/builds/key-${variant}`,
    artifact: `/builds/key-${variant}/app-release.apk`,
    applicationId: `com.reanimatedbenchmark.${variant}`,
    installedVersions: { reanimated: '4.7.1', worklets: '0.13.1' },
    effectiveFlags: {
      reanimated: { ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: false },
      worklets: {},
    },
    lockfileSha256: 'lock',
    appBuild: 'sources',
    ...overrides,
  };
}

describe('variantDifferences', () => {
  it('gives no difference for two equal builds', () => {
    assert.deepEqual(
      variantDifferences(CONFIG, { a: built('a'), b: built('b') }),
      []
    );
  });

  it('lists only the fields that differ', () => {
    assert.deepEqual(
      variantDifferences(CONFIG, {
        a: built('a'),
        b: built('b', {
          effectiveFlags: {
            reanimated: { ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: true },
            worklets: {},
          },
        }),
      }),
      [
        {
          field: 'reanimated ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS',
          a: 'false',
          b: 'true',
        },
      ]
    );
  });

  it('lists sources, the resolved yarn.lock and build options', () => {
    const config = {
      ...CONFIG,
      b: {
        ...VARIANT,
        reanimated: { kind: 'tarball' as const, path: '/t/r.tgz' },
        profiling: true,
      },
    };
    assert.deepEqual(
      variantDifferences(config, {
        a: built('a'),
        b: built('b', { lockfileSha256: 'other lock' }),
      }).map((difference) => difference.field),
      ['reanimated source', 'yarn.lock SHA-256', 'profiling']
    );
  });
});
