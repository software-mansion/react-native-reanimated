import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const preRegistryMutations = [
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
    id: 'layout-start-suppression',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `  for (auto &node : layout_) {
    startLayoutAnimation(node);
  }`,
    replacement: `  for (auto &node : layout_) {
    (void)node;
  }`,
    test: 'LayoutAnimationStressTest.MixedListChurnOverlapsEnteringLayoutAndExiting',
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
    id: 'shared-absolute-position',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/SharedTransitions.cpp',
    search: '    copy.layoutMetrics.frame.origin = absolutePositions[0];',
    replacement: '    copy.layoutMetrics.frame.origin = node->current.layoutMetrics.frame.origin;',
    test: 'LayoutAnimationScenariosTest.InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress',
  },
  {
    id: 'shared-interactive-progress',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/SharedTransitions.cpp',
    search: '      auto x = before.origin.x + transitionProgress_ * (after.origin.x - before.origin.x);',
    replacement: '      auto x = before.origin.x;',
    test: 'LayoutAnimationScenariosTest.InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress',
  },
  {
    id: 'progress-style-props',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: 'UpdateValues{newProps, Frame(uiRuntime_, newStyle)}',
    replacement: 'UpdateValues{layoutAnimation.finalView.props, Frame(uiRuntime_, newStyle)}',
    test: 'LayoutAnimationScenariosTest.ProgressAppliesAnimatedStyleProps',
  },
  {
    id: 'settled-final-frame',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `    if (layoutAnimationIt == layoutAnimations_.end() ||
        (layoutAnimationIt->second.isSettled() && layoutAnimationIt->second.isExitingWhenSettled)) {`,
    replacement: `    if (layoutAnimationIt == layoutAnimations_.end() || layoutAnimationIt->second.isSettled()) {`,
    test: 'LayoutAnimationScenariosTest.ZeroDurationEnteringCanSettleOnItsFirstFrame',
  },
  {
    id: 'entering-initial-opacity',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `  const folly::dynamic opacity = folly::dynamic::object("opacity", 0);
  auto newProps =
      getComponentDescriptorForShadowView(newView).cloneProps(propsParserContext, newView.props, RawProps(opacity));
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(newProps));
  viewProps->opacity = 0;`,
    replacement: `  const folly::dynamic opacity = folly::dynamic::object("opacity", 1);
  auto newProps =
      getComponentDescriptorForShadowView(newView).cloneProps(propsParserContext, newView.props, RawProps(opacity));
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(newProps));
  viewProps->opacity = 1;`,
    test: 'ProxySmokeTest.RunsEnteringAnimationThroughTheRealProxy',
  },
  {
    id: 'removed-animation-config',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsManager.cpp',
    search: '      getConfigsForType(type).erase(tag);',
    replacement: '      (void)tag;',
    test: 'LayoutAnimationScenariosTest.RemovingAnExitConfigUnmountsWithoutStartingIt',
  },
  {
    id: 'skip-exiting-inheritance',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsManager.cpp',
    search: '  return shouldAnimateExitingForTag_.contains(tag) ? shouldAnimateExitingForTag_[tag] : shouldAnimate;',
    replacement: '  return shouldAnimate;',
    test: 'LayoutAnimationScenariosTest.SkipExitingOnAnAncestorRemovesItsAnimatedSubtreeImmediately',
  },
  {
    id: 'skip-exiting-child-override',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsManager.cpp',
    search: '  return shouldAnimateExitingForTag_.contains(tag) ? shouldAnimateExitingForTag_[tag] : shouldAnimate;',
    replacement:
        '  return shouldAnimateExitingForTag_.contains(tag) ? shouldAnimateExitingForTag_[tag] && shouldAnimate : shouldAnimate;',
    test: 'LayoutAnimationScenariosTest.NestedSkipExitingCanBeOverriddenForAChild',
  },
  {
    id: 'immediate-exit-registration',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `    node->state = ANIMATING;
    lightNodes_[node->current.tag] = node;
    startExitingAnimation(node);`,
    replacement: `    node->state = ANIMATING;
    startExitingAnimation(node);
    lightNodes_[node->current.tag] = node;`,
    test: 'LayoutAnimationScenariosTest.ImmediateExitCompletionCanReenterTheStartCallback',
  },
  {
    id: 'modal-screen-exit-suppression',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsUtils.h',
    search: `static inline bool isRNSScreenOrStack(const std::shared_ptr<LightNode> &node) {
  const auto componentName = node->current.componentName;
  react_native_assert(componentName && "Component name is nullptr");
  return !std::strcmp(componentName, "RNSScreenStack") || !std::strcmp(componentName, "RNSScreen") ||
      !std::strcmp(componentName, "RNSModalScreen");
}`,
    replacement: `static inline bool isRNSScreenOrStack(const std::shared_ptr<LightNode> &node) {
  const auto componentName = node->current.componentName;
  react_native_assert(componentName && "Component name is nullptr");
  return !std::strcmp(componentName, "RNSScreenStack") || !std::strcmp(componentName, "RNSScreen");
}`,
    test: 'LayoutAnimationScenariosTest.RemovingAModalScreenSkipsDescendantExitAnimations',
  },
  {
    id: 'waiting-node-recreation',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '      lightNodes_[subNode->current.tag] = subNode;',
    replacement: '',
    test: 'LayoutAnimationScenariosTest.RecreatingAWaitingSubviewFlushesItsWithheldRemoval',
  },
  {
    id: 'nested-exit-ancestor-retention',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `    if (hasAnimatedChildren) {
      node->setExitingState(WAITING);
      lightNodes_[node->current.tag] = node;
    }`,
    replacement: '',
    test: 'LayoutAnimationScenariosTest.NestedExitingGrandchildKeepsAllDeletedAncestorsAlive',
  },
  {
    id: 'settled-node-recreation',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `    } else {
      // A settled exiting view (state DEAD) has already left lightNodes_ but is`,
    replacement: `    } else {
      continue;
      // A settled exiting view (state DEAD) has already left lightNodes_ but is`,
    test: 'LayoutAnimationScenariosTest.RecreatingASettledExitBeforeCleanupReplacesTheDeadNode',
  },
  {
    id: 'reanimated-tag-cleanup',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `    if (layoutAnimationIt == layoutAnimations_.end() || !layoutAnimationIt->second.isSettled()) {
      continue;
    }`,
    replacement: `    if (layoutAnimationIt == layoutAnimations_.end()) {
      continue;
    }`,
    test: 'LayoutAnimationScenariosTest.RecreatingASettledExitBeforeCleanupReplacesTheDeadNode',
  },
  {
    id: 'shared-source-hide',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '      hideTransitioningViews(BEFORE, mergedMutations, propsParserContext);',
    replacement: '',
    test: 'LayoutAnimationScenariosTest.SharedTagMovesBetweenActiveBoundaries',
  },
  {
    id: 'shared-target-hide',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '      hideTransitioningViews(AFTER, mergedMutations, propsParserContext);',
    replacement: '',
    test: 'LayoutAnimationScenariosTest.SharedTargetUpdateDuringBoundaryFlipStaysHidden',
  },
  {
    id: 'shared-target-restore',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '    tagsToRestore_.push_back(restoreMap_[tag][1]);',
    replacement: '',
    test: 'LayoutAnimationScenariosTest.SharedTagMovesBetweenActiveBoundaries',
  },
  {
    id: 'interactive-cancel-source-restore',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/SharedTransitions.cpp',
    search: '        tagsToRestore_.push_back(restoreMap_[tag][BEFORE]);',
    replacement: '',
    test: 'LayoutAnimationScenariosTest.CancellingInteractiveSharedTransitionRestoresBothSides',
  },
];

const hostPositionMutations = [
  {
    id: 'exiting-host-position',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `  if (startAnimationsRecursively(node, teardownMutations, config)) {
    return;
  }`,
    replacement: `  if (startAnimationsRecursively(node, teardownMutations, config)) {
    filteredMutations.push_back(
        ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, hostIndex));
    parent->children.erase(parent->children.begin() + hostIndex);
    filteredMutations.push_back(ShadowViewMutation::InsertMutation(
        parent->current.tag, node->current, static_cast<int>(parent->children.size())));
    parent->children.push_back(node);
    return;
  }`,
    test: 'LayoutAnimationScenariosTest.ExitingViewKeepsItsHostIndexUntilCompletion',
  },
];

const registryMutations = [
  {
    id: 'android-ui-cleanup-serialization',
    platform: 'android',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `#ifdef ANDROID
  return !worklets::isOnUIThread(uiScheduler_);
#else`,
    replacement: `#ifdef ANDROID
  return true;
#else`,
    test: 'LayoutAnimationStressTest.UICleanupCannotOvertakeAPausedJSMountSchedule',
  },
  {
    id: 'captured-config-retarget',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: `        if (!config) {
          config = getRetargetLayoutAnimationConfig(tag);
        }
`,
    replacement: '',
    test: 'LayoutAnimationScenariosTest.ConfigRemovalRetargetsWithTheCapturedLayoutConfig',
  },
  {
    id: 'shared-absolute-position',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/SharedTransitions.cpp',
    search: '    copy.layoutMetrics.frame.origin = absolutePositions[0];',
    replacement: '    copy.layoutMetrics.frame.origin = node->current.layoutMetrics.frame.origin;',
    test: 'LayoutAnimationScenariosTest.InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress',
  },
  {
    id: 'shared-interactive-progress',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/SharedTransitions.cpp',
    search: '      auto x = before.origin.x + transition_->progress * (after.origin.x - before.origin.x);',
    replacement: '      auto x = before.origin.x;',
    test: 'LayoutAnimationScenariosTest.InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress',
  },
  {
    id: 'modal-screen-exit-suppression',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsUtils.h',
    search: `static inline bool isRNSScreenOrStack(const std::shared_ptr<LightNode> &node) {
  const auto componentName = node->current.componentName;
  react_native_assert(componentName && "Component name is nullptr");
  return !std::strcmp(componentName, "RNSScreenStack") || !std::strcmp(componentName, "RNSScreen") ||
      !std::strcmp(componentName, "RNSModalScreen");
}`,
    replacement: `static inline bool isRNSScreenOrStack(const std::shared_ptr<LightNode> &node) {
  const auto componentName = node->current.componentName;
  react_native_assert(componentName && "Component name is nullptr");
  return !std::strcmp(componentName, "RNSScreenStack") || !std::strcmp(componentName, "RNSScreen");
}`,
    test: 'LayoutAnimationScenariosTest.RemovingAModalScreenSkipsDescendantExitAnimations',
  },
  {
    id: 'waiting-node-recreation',
    platform: 'ios',
    source: 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp',
    search: '      lightNodes_[subNode->current.tag] = subNode;',
    replacement: '',
    test: 'LayoutAnimationScenariosTest.RecreatingAWaitingSubviewFlushesItsWithheldRemoval',
  },
];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const harnessDirectory = resolve(scriptDirectory, '..');
const repositoryDirectory = resolve(harnessDirectory, '..');
const options = parseOptions(process.argv.slice(2));
const configuredBuild = resolve(repositoryDirectory, options.build ?? 'build/layout-animation-harness');
const cache = readCache(join(configuredBuild, 'CMakeCache.txt'));
const configuredReanimated = required(cache, 'REANIMATED_DIR');
const usesProxyRegistry = existsSync(
  join(configuredReanimated, 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.cpp'),
);
const proxySource = readFileSync(
  join(configuredReanimated, 'Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp'),
  'utf8',
);
const keepsExitingHostPosition = proxySource.includes('handleSubtreeRemoval(');
const mutations = (usesProxyRegistry ? registryMutations : preRegistryMutations)
    .filter((mutation) => mutation.id !== 'immediate-exit-registration' || !keepsExitingHostPosition)
    .concat(keepsExitingHostPosition ? hostPositionMutations : [])
    .filter((mutation) => !options.mutation || mutation.id === options.mutation);
if (mutations.length === 0) {
  throw new Error(`Unknown mutation for this profile: ${options.mutation}`);
}
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'layout-animation-mutations-'));
const reanimatedDirectory = join(temporaryDirectory, 'react-native-reanimated');
const buildDirectory = join(temporaryDirectory, 'build');

try {
  process.stdout.write(
    `Profile: ${usesProxyRegistry ? 'proxy-registry' : keepsExitingHostPosition ? 'host-index-retaining-proxy' : 'pre-registry-experimental-proxy'}\n`,
  );
  mkdirSync(reanimatedDirectory);
  cpSync(join(configuredReanimated, 'Common'), join(reanimatedDirectory, 'Common'), {
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

  const results = [];
  for (const mutation of mutations) {
    const result = runMutation(buildDirectory, reanimatedDirectory, mutation);
    results.push(result);
    const outcome = result.killed ? 'KILLED' : 'SURVIVED';
    process.stdout.write(`${outcome.padEnd(8)} ${result.id} -> ${result.test}\n`);
  }

  const survived = results.filter((result) => !result.killed);
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
    } else if (arguments_[index] === '--mutation' && arguments_[index + 1]) {
      parsed.mutation = arguments_[++index];
    } else {
      throw new Error(`Unknown option: ${arguments_[index]}`);
    }
  }
  return parsed;
}
