import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { androidBuild } from '../android-build.mts';
import { applicationIdOf } from '../application-id.mts';
import { addLibraries } from '../build-copy.mts';
import {
  appBuildIdentity,
  collectBuildKeyInputs,
  listProjectFiles,
  variantBuildKey,
} from '../build-key.mts';
import type { BuildKeyInputs } from '../build-key.mts';
import type { Variant } from '../config.mts';
import { IOS_BUILD } from '../ios-build.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import type { Processes } from '../processes.mts';
import type { BuildRequest, ProjectCommand } from '../variant-build.mts';

const ROOT = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `variant-build-${process.pid}`
);

function write(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

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

describe('listProjectFiles', () => {
  it('lists the sources of the app project and skips dependencies, build output and the driver', () => {
    const appDir = path.join(ROOT, 'listed-app');
    const copied = [
      'android/app/build.gradle',
      'android/gradlew',
      'ios/Podfile',
      'package.json',
      'src/App.tsx',
      'src/scripts/helper.ts',
      'yarn.lock',
    ];
    const skipped = [
      'node_modules/react/index.js',
      'android/app/build/outputs/apk/release/app-release.apk',
      'android/.gradle/8.0/file',
      'android/app/.cxx/x',
      'ios/Pods/Manifest.lock',
      'ios/build/x',
      'scripts/benchmark.mts',
      'vendor/bundle/ruby/x',
      '.yarn/install-state.gz',
    ];
    for (const file of [...copied, ...skipped]) {
      write(path.join(appDir, file), file);
    }
    assert.deepEqual(listProjectFiles(appDir), copied);
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

describe('appBuildIdentity', () => {
  const inputs: BuildKeyInputs = {
    variant: VARIANT,
    platform: 'ios',
    suffix: '.a',
    nodeVersion: 'v24.16.0',
    toolIdentity: { xcode: '27.2', sdk: '27.1' },
    projectHash: 'project',
    tarballHashes: {},
    procedureHash: 'procedure',
  };

  it('changes with the app sources, the tools and the build procedure, not with the variant', () => {
    const identity = appBuildIdentity(inputs);
    assert.match(identity, /^[0-9a-f]{64}$/);
    for (const same of [
      { suffix: '.b' },
      { tarballHashes: { worklets: 'other' } },
      {
        variant: { ...VARIANT, reanimated: { kind: 'npm', version: '4.6.0' } },
      },
    ] as const) {
      assert.equal(appBuildIdentity({ ...inputs, ...same }), identity);
    }
    for (const changed of [
      { nodeVersion: 'v26.0.0' },
      { toolIdentity: { xcode: '27.3', sdk: '27.1' } },
      { projectHash: 'changed' },
      { procedureHash: 'changed' },
    ]) {
      assert.notEqual(appBuildIdentity({ ...inputs, ...changed }), identity);
    }
  });
});

describe('addLibraries', () => {
  const directory = path.join(ROOT, 'copy');
  const installLibraries = async (command: ProjectCommand) => {
    commands.push(command);
    write(path.join(directory, 'yarn.lock'), 'resolved lock');
    for (const [name, version, flags] of [
      [
        'react-native-reanimated',
        '4.7.1',
        {
          ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: false,
          IOS_CSS_CORE_ANIMATION: true,
        },
      ],
      ['react-native-worklets', '0.13.1', { WORKLETS_FLAG: false }],
    ] as const) {
      const library = path.join(directory, 'node_modules', name);
      write(path.join(library, 'package.json'), JSON.stringify({ version }));
      write(
        path.join(library, 'src', 'featureFlags', 'staticFlags.json'),
        JSON.stringify(flags)
      );
    }
  };
  let commands: ProjectCommand[] = [];

  before(() => {
    write(path.join(directory, 'package.json'), '{"name":"app"}');
  });

  it('adds the two packages, merges the flags over the library defaults, writes only the flags of the variant and hashes the resolved yarn.lock', async () => {
    commands = [];
    const added = await addLibraries(directory, VARIANT, installLibraries);
    assert.deepEqual(commands[0].args, [
      'add',
      'react-native-reanimated@4.7.1',
      'react-native-worklets@file:/abs/react-native-worklets-0.13.1.tgz',
    ]);
    assert.deepEqual(added, {
      installedVersions: { reanimated: '4.7.1', worklets: '0.13.1' },
      effectiveFlags: {
        reanimated: {
          ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: true,
          IOS_CSS_CORE_ANIMATION: false,
        },
        worklets: { WORKLETS_FLAG: false },
      },
      lockfileSha256: crypto
        .createHash('sha256')
        .update('resolved lock')
        .digest('hex'),
    });
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')),
      {
        name: 'app',
        reanimated: { staticFeatureFlags: VARIANT.reanimatedFlags },
      }
    );
  });

  it('stops for a flag that the installed library does not have', async () => {
    await assert.rejects(
      addLibraries(
        directory,
        { ...VARIANT, workletsFlags: { TYPO_FLAG: true } },
        installLibraries
      ),
      /react-native-worklets has no static flag TYPO_FLAG \(known: WORKLETS_FLAG\)/
    );
  });
});

describe('platform builds', () => {
  const project = (key: 'a' | 'b', variant: Variant) => {
    const commands: ProjectCommand[] = [];
    return {
      commands,
      project: {
        directory: '/builds/key',
        key,
        variant,
        appBuild: 'sources',
        run: async (command: ProjectCommand) => void commands.push(command),
      },
    };
  };

  it('builds one Android ABI with the application id suffix and the profiling properties', async () => {
    const plain = project('a', VARIANT);
    assert.equal(
      await androidBuild('/sdk').build(plain.project),
      '/builds/key/android/app/build/outputs/apk/release/app-release.apk'
    );
    assert.deepEqual(plain.commands[0].args, [
      'assembleRelease',
      '-PreactNativeArchitectures=arm64-v8a',
      '-PbenchmarkApplicationIdSuffix=.a',
    ]);
    assert.equal(plain.commands[0].env?.ANDROID_HOME, '/sdk');
    const profiling = project('b', { ...VARIANT, profiling: true });
    await androidBuild('/sdk').build(profiling.project);
    assert.deepEqual(profiling.commands[0].args.slice(2), [
      '-PbenchmarkApplicationIdSuffix=.b',
      '-PenableReanimatedProfiling=true',
      '-PenableWorkletsProfiling=true',
    ]);
    assert.equal(applicationIdOf('b'), 'com.reanimatedbenchmark.b');
  });

  it('builds iOS Release for a device without signing and sets the bundle id suffix', async () => {
    const ios = project('b', VARIANT);
    assert.equal(
      await IOS_BUILD.build(ios.project),
      '/builds/key/ios/build/Build/Products/Release-iphoneos/ReanimatedBenchmark.app'
    );
    assert.deepEqual(
      ios.commands.map((command) => command.command),
      ['bundle', 'bundle', 'xcodebuild']
    );
    const args = ios.commands[2].args;
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
  const root = path.join(ROOT, 'key');
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
