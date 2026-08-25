import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mutations = [
  {
    id: 'pending-start-cancellation',
    platform: 'android',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h',
    search: 'const bool isCancelled = it->second.handle != handle;',
    replacement: 'const bool isCancelled = false;',
    test: 'LayoutAnimationStressTest.InterruptedExitsAreCancelledBeforeBlockedUIWorkRuns',
  },
  {
    id: 'recreated-tag-reconciliation',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '  reconcileContradictedRemovals(mutations, filteredMutations);',
    replacement: '',
    test: 'LayoutAnimationScenariosTest.RecreatingAnExitingTagCancelsTheStaleRemoval',
  },
  {
    id: 'retarget-from-mounted-frame',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '    oldView = layoutAnimation.currentView;',
    replacement: '    oldView = before;',
    test: 'LayoutAnimationScenariosTest.LayoutProgressAndRetargetUseTheCurrentMountedFrame',
  },
  {
    id: 'retarget-completion-count',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '    count = layoutAnimation.count + 1;',
    replacement: '    count = 1;',
    test: 'LayoutAnimationScenariosTest.LayoutProgressAndRetargetUseTheCurrentMountedFrame',
  },
  {
    id: 'shared-container-cleanup',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '  cleanupSharedTransitions(filteredMutations, propsParserContext, surfaceId);',
    replacement: '',
    test: 'LayoutAnimationScenariosTest.SharedTagMovesBetweenActiveBoundaries',
  },
  {
    id: 'progress-style-props',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: 'UpdateValues{newProps, Frame(uiRuntime_, newStyle)}',
    replacement: 'UpdateValues{layoutAnimation.finalView.props, Frame(uiRuntime_, newStyle)}',
    test: 'LayoutAnimationScenariosTest.ProgressAppliesAnimatedStyleProps',
  },
];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const harnessDirectory = resolve(scriptDirectory, '..');
const repositoryDirectory = resolve(harnessDirectory, '..');
const options = parseOptions(process.argv.slice(2));
const configuredBuild = resolve(repositoryDirectory, options.build ?? 'build/layout-animation-harness');
const cache = readCache(join(configuredBuild, 'CMakeCache.txt'));
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'layout-animation-mutations-'));
const reanimatedDirectory = join(temporaryDirectory, 'react-native-reanimated');
const buildDirectory = join(temporaryDirectory, 'build');

try {
  mkdirSync(reanimatedDirectory);
  cpSync(join(required(cache, 'REANIMATED_DIR'), 'Common'), join(reanimatedDirectory, 'Common'), {
    recursive: true,
  });

  configure(buildDirectory, reanimatedDirectory, cache);
  build(buildDirectory, ['harness_ios_tests', 'harness_android_tests']);

  for (const mutation of mutations) {
    const baseline = runTest(buildDirectory, mutation);
    if (baseline.status !== 0 || !baseline.stdout.includes(`[ RUN      ] ${mutation.test}`)) {
      fail(`Baseline failed for ${mutation.id}`, baseline);
    }
  }

  const results = mutations.map((mutation) => runMutation(buildDirectory, reanimatedDirectory, mutation));
  const survived = results.filter((result) => !result.killed);

  for (const result of results) {
    const outcome = result.killed ? 'KILLED' : 'SURVIVED';
    process.stdout.write(`${outcome.padEnd(8)} ${result.id} -> ${result.test}\n`);
  }

  if (survived.length !== 0) {
    process.exitCode = 1;
  }
} finally {
  if (options.keep) {
    process.stdout.write(`Kept ${temporaryDirectory}\n`);
  } else {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function runMutation(buildDirectory, reanimatedDirectory, mutation) {
  const source = join(reanimatedDirectory, mutation.source);
  const original = readFileSync(source, 'utf8');
  const changed = replaceOnce(original, mutation.search, mutation.replacement, mutation.id);
  writeFileSync(source, changed);

  try {
    build(buildDirectory, [`harness_${mutation.platform}_tests`]);
    const result = runTest(buildDirectory, mutation);
    return {
      id: mutation.id,
      test: mutation.test,
      killed: result.status !== 0 || result.signal !== null || result.error?.code === 'ETIMEDOUT',
    };
  } finally {
    writeFileSync(source, original);
  }
}

function replaceOnce(source, search, replacement, id) {
  const first = source.indexOf(search);
  if (first === -1 || source.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Mutation ${id} requires exactly one source match`);
  }
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function configure(buildDirectory, reanimatedDirectory, cache) {
  const arguments_ = [
    '-S',
    harnessDirectory,
    '-B',
    buildDirectory,
    '-G',
    cache.CMAKE_GENERATOR || 'Ninja',
    `-DREACT_COMMON_DIR=${required(cache, 'REACT_COMMON_DIR')}`,
    `-DREANIMATED_DIR=${reanimatedDirectory}`,
    `-DWORKLETS_DIR=${required(cache, 'WORKLETS_DIR')}`,
    `-DHERMES_ROOT=${required(cache, 'HERMES_ROOT')}`,
  ];
  for (const key of ['FETCHCONTENT_SOURCE_DIR_FOLLY', 'FETCHCONTENT_SOURCE_DIR_GOOGLETEST']) {
    if (cache[key]) {
      arguments_.push(`-D${key}=${cache[key]}`);
    }
  }
  run('cmake', arguments_);
}

function build(buildDirectory, targets) {
  run('cmake', ['--build', buildDirectory, '--target', ...targets, '--parallel', '8']);
}

function runTest(buildDirectory, mutation) {
  return spawnSync(join(buildDirectory, `harness_${mutation.platform}_tests`), [
    `--gtest_filter=${mutation.test}`,
    '--gtest_color=no',
  ], {
    encoding: 'utf8',
    timeout: 60_000,
  });
}

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`${command} ${arguments_.join(' ')}`, result);
  }
}

function fail(message, result) {
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  throw new Error(`${message}\n${output}`);
}

function readCache(path) {
  const entries = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^([^/#][^:]*):[^=]*=(.*)$/);
    if (match) {
      entries[match[1]] = match[2];
    }
  }
  return entries;
}

function required(cache, key) {
  if (!cache[key]) {
    throw new Error(`${key} is missing from ${configuredBuild}/CMakeCache.txt`);
  }
  return cache[key];
}

function parseOptions(arguments_) {
  const parsed = { keep: false };
  for (let index = 0; index < arguments_.length; ++index) {
    if (arguments_[index] === '--keep') {
      parsed.keep = true;
    } else if (arguments_[index] === '--build' && arguments_[index + 1]) {
      parsed.build = arguments_[++index];
    } else {
      throw new Error(`Unknown option: ${arguments_[index]}`);
    }
  }
  return parsed;
}
