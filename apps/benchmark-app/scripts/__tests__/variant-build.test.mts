import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { gradleArguments } from '../android-build.mts';
import type { Variant } from '../config.mts';
import { signArguments, xcodebuildArguments } from '../ios-build.mts';
import type { BuildKeyInputs } from '../variant-build.mts';
import {
  applicationIdOf,
  isCopied,
  mergeFlags,
  packageSpec,
  variantBuildKey,
  withStaticFlags,
} from '../variant-build.mts';

const VARIANT: Variant = {
  reanimated: { kind: 'npm', version: '4.7.1' },
  worklets: { kind: 'tarball', path: '/abs/react-native-worklets-0.13.1.tgz' },
  reanimatedFlags: {
    ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: true,
    IOS_CSS_CORE_ANIMATION: false,
  },
  workletsFlags: {},
  bundleMode: false,
  profiling: false,
};

describe('isCopied', () => {
  it('copies the sources of the app project', () => {
    for (const file of [
      'package.json',
      'yarn.lock',
      'src/App.tsx',
      'android/app/build.gradle',
      'android/gradlew',
      'ios/Podfile',
    ]) {
      assert.ok(isCopied(file), file);
    }
  });

  it('skips dependencies, build output and the driver', () => {
    for (const file of [
      'node_modules/react/index.js',
      'android/app/build/outputs/apk/release/app-release.apk',
      'android/.gradle/8.0/file',
      'android/app/.cxx/x',
      'ios/Pods/Manifest.lock',
      'ios/build/x',
      'scripts/benchmark.mts',
      'vendor/bundle/ruby/x',
      '.yarn/install-state.gz',
    ]) {
      assert.ok(!isCopied(file), file);
    }
  });

  it('skips only the top-level scripts folder', () => {
    assert.ok(isCopied('src/scripts/helper.ts'));
  });
});

describe('variantBuildKey', () => {
  const inputs: BuildKeyInputs = {
    variant: VARIANT,
    platform: 'android',
    platformOptions: '',
    suffix: '.a',
    projectHash: 'project',
    tarballHashes: {},
    procedureHash: 'procedure',
  };

  it('is stable and changes with each input', () => {
    const key = variantBuildKey(inputs);
    assert.match(key, /^[0-9a-f]{16}$/);
    assert.equal(variantBuildKey({ ...inputs }), key);
    for (const changed of [
      { suffix: '.b' },
      { platform: 'ios' as const },
      { platformOptions: 'sign.sh' },
      { projectHash: 'changed' },
      { tarballHashes: { worklets: 'other' } },
      { procedureHash: 'changed' },
      { variant: { ...VARIANT, profiling: true } },
    ]) {
      assert.notEqual(variantBuildKey({ ...inputs, ...changed }), key);
    }
  });

  it('does not depend on the order of the flags', () => {
    const reordered = {
      ...VARIANT,
      reanimatedFlags: {
        IOS_CSS_CORE_ANIMATION: false,
        ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: true,
      },
    };
    assert.equal(
      variantBuildKey({ ...inputs, variant: reordered }),
      variantBuildKey(inputs)
    );
  });
});

describe('packageSpec', () => {
  it('names an npm version or a tarball file', () => {
    assert.equal(
      packageSpec('react-native-reanimated', VARIANT.reanimated),
      'react-native-reanimated@4.7.1'
    );
    assert.equal(
      packageSpec('react-native-worklets', VARIANT.worklets),
      'react-native-worklets@file:/abs/react-native-worklets-0.13.1.tgz'
    );
  });
});

describe('static flags', () => {
  it('merges the variant flags over the library defaults', () => {
    assert.deepEqual(
      mergeFlags({ A_FLAG: false, B_FLAG: true }, { A_FLAG: true }, 'lib'),
      { A_FLAG: true, B_FLAG: true }
    );
  });

  it('stops for a flag that the installed library does not have', () => {
    assert.throws(
      () =>
        mergeFlags(
          { A_FLAG: false },
          { TYPO_FLAG: true },
          'react-native-reanimated'
        ),
      /has no static flag TYPO_FLAG/
    );
  });

  it('writes only the flags that the variant sets', () => {
    assert.deepEqual(
      withStaticFlags({ name: 'app', dependencies: {} }, VARIANT),
      {
        name: 'app',
        dependencies: {},
        reanimated: { staticFeatureFlags: VARIANT.reanimatedFlags },
        worklets: undefined,
      }
    );
  });
});

describe('gradleArguments', () => {
  it('builds one ABI with the application id suffix', () => {
    assert.deepEqual(gradleArguments('a', false), [
      'assembleRelease',
      '-PreactNativeArchitectures=arm64-v8a',
      '-PbenchmarkApplicationIdSuffix=.a',
    ]);
    assert.equal(applicationIdOf('b'), 'com.reanimatedbenchmark.b');
  });

  it('adds the profiling properties', () => {
    assert.deepEqual(gradleArguments('b', true).slice(2), [
      '-PbenchmarkApplicationIdSuffix=.b',
      '-PenableReanimatedProfiling=true',
      '-PenableWorkletsProfiling=true',
    ]);
  });
});

describe('xcodebuildArguments', () => {
  it('builds Release for a device without signing and sets the bundle id suffix', () => {
    const args = xcodebuildArguments('b');
    assert.deepEqual(args.slice(0, 8), [
      '-workspace',
      'ReanimatedBenchmark.xcworkspace',
      '-scheme',
      'ReanimatedBenchmark',
      '-configuration',
      'Release',
      '-sdk',
      'iphoneos',
    ]);
    assert.ok(args.includes('BENCHMARK_BUNDLE_IDENTIFIER_SUFFIX=.b'));
    assert.ok(args.includes('CODE_SIGNING_ALLOWED=NO'));
    assert.equal(args.at(-1), 'build');
  });
});

describe('signArguments', () => {
  it('gives the app and the output file to the sign command as two arguments', () => {
    assert.deepEqual(
      signArguments('./sign.sh --team T', '/b/My App.app', '/b/out.ipa'),
      [
        '-c',
        './sign.sh --team T "$1" "$2"',
        'sign',
        '/b/My App.app',
        '/b/out.ipa',
      ]
    );
  });
});
