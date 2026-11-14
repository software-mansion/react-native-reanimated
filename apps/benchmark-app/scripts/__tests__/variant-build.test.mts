import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { androidBuild, gradleArguments } from '../android-build.mts';
import type { Variant } from '../config.mts';
import { IOS_BUILD, xcodebuildArguments } from '../ios-build.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import type { Processes } from '../processes.mts';
import {
  applicationIdOf,
  collectBuildKeyInputs,
  isCopied,
  mergeFlags,
  packageSpec,
  variantBuildKey,
  withStaticFlags,
} from '../variant-build.mts';
import type { BuildKeyInputs, BuildRequest } from '../variant-build.mts';

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
    suffix: '.a',
    nodeVersion: 'v24.16.0',
    toolIdentity: { jdk: '17', ndk: '27.1' },
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
      { nodeVersion: 'v26.0.0' },
      { toolIdentity: { jdk: '21', ndk: '27.1' } },
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

describe('collectBuildKeyInputs', () => {
  const root = path.join(
    REPOSITORY_ROOT,
    '.tmp',
    'benchmarks',
    'tests',
    `variant-build-${process.pid}`
  );
  const appDir = path.join(root, 'app');
  const androidHome = path.join(root, 'sdk');
  const tarball = path.join(root, 'react-native-worklets-0.13.1.tgz');
  const toolOutputs: Record<string, string> = {
    'java -version': 'openjdk version "17.0.21"',
    'xcrun xcodebuild -version': 'Xcode 27.2\nBuild version 27B52',
    'xcrun --sdk iphoneos --show-sdk-version': '27.2',
    'xcrun --sdk iphoneos --show-sdk-build-version': '24C100',
  };
  const processes = {
    run: async (command: string, args: string[]) => {
      const line = [path.basename(command), ...args].join(' ');
      const output = toolOutputs[line];
      assert.ok(output !== undefined, line);
      return line.startsWith('java')
        ? { stdout: '', stderr: output }
        : { stdout: output, stderr: '' };
    },
  } as unknown as Processes;
  const request: BuildRequest = {
    appDir,
    buildsDir: path.join(root, 'builds'),
    key: 'a',
    variant: { ...VARIANT, worklets: { kind: 'tarball', path: tarball } },
    processes,
    log: () => {},
  };
  const write = (file: string, content: string) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  before(() => {
    write(path.join(appDir, 'package.json'), '{}');
    write(path.join(appDir, 'yarn.lock'), 'lock 1');
    write(path.join(appDir, 'src', 'App.tsx'), 'app 1');
    write(
      path.join(appDir, 'android', 'build.gradle'),
      'ndkVersion = "27.1.12297006"\nbuildToolsVersion = "37.0.0"\n'
    );
    write(
      path.join(androidHome, 'ndk', '27.1.12297006', 'source.properties'),
      'Pkg.Revision = 27.1.12297006\n'
    );
    write(
      path.join(androidHome, 'build-tools', '37.0.0', 'source.properties'),
      'Pkg.Revision = 37.0.0\n'
    );
    write(tarball, 'worklets 1');
  });

  after(() => fs.rmSync(root, { recursive: true, force: true }));

  it('reads each input of the key from the project, the tarballs and the tools', async () => {
    const inputs = await collectBuildKeyInputs(
      request,
      androidBuild(androidHome)
    );
    assert.deepEqual(Object.keys(inputs).sort(), [
      'nodeVersion',
      'platform',
      'procedureHash',
      'projectHash',
      'suffix',
      'tarballHashes',
      'toolIdentity',
      'variant',
    ]);
    assert.equal(inputs.nodeVersion, process.version);
    assert.deepEqual(inputs.toolIdentity, {
      jdk: 'openjdk version "17.0.21"',
      ndk: '27.1.12297006 27.1.12297006',
      buildTools: '37.0.0 37.0.0',
    });
    const ios = await collectBuildKeyInputs(request, IOS_BUILD);
    assert.deepEqual(ios.toolIdentity, {
      xcode: 'Xcode 27.2, Build version 27B52',
      iphoneosSdk: '27.2',
      iphoneosSdkBuild: '24C100',
    });
  });

  it('gives another key when a source file, the lockfile, a tarball or a tool changes', async () => {
    const keyOf = async () =>
      variantBuildKey(
        await collectBuildKeyInputs(request, androidBuild(androidHome))
      );
    const changes: [string, () => void][] = [
      ['source', () => write(path.join(appDir, 'src', 'App.tsx'), 'app 2')],
      ['lockfile', () => write(path.join(appDir, 'yarn.lock'), 'lock 2')],
      ['tarball', () => write(tarball, 'worklets 2')],
      [
        'ndk',
        () =>
          write(
            path.join(androidHome, 'ndk', '27.1.12297006', 'source.properties'),
            'Pkg.Revision = 27.1.12297007\n'
          ),
      ],
      [
        'jdk',
        () => {
          toolOutputs['java -version'] = 'openjdk version "21.0.5"';
        },
      ],
    ];
    for (const [name, change] of changes) {
      const before = await keyOf();
      change();
      assert.notEqual(await keyOf(), before, name);
    }
    const iosKey = async () =>
      variantBuildKey(await collectBuildKeyInputs(request, IOS_BUILD));
    const iosBefore = await iosKey();
    toolOutputs['xcrun --sdk iphoneos --show-sdk-build-version'] = '24C101';
    assert.notEqual(await iosKey(), iosBefore);
  });
});
