#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <reanimated/Compat/ReactNativeDebug.h>

#include <functional>
#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

void LayoutAnimationsManager::configureAnimationBatch(const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch) {
  const std::lock_guard<std::mutex> lock(pendingConfigUpdatesMutex_);
  pendingConfigUpdates_.insert(pendingConfigUpdates_.end(), layoutAnimationsBatch.begin(), layoutAnimationsBatch.end());
}

std::unique_lock<std::recursive_mutex> LayoutAnimationsManager::lockAndFlushConfigUpdates() {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  std::vector<LayoutAnimationConfig> configUpdates;
  {
    const std::lock_guard<std::mutex> pendingLock(pendingConfigUpdatesMutex_);
    configUpdates = std::exchange(pendingConfigUpdates_, {});
  }
  if (configUpdates.empty()) {
    return lock;
  }
  auto sharedTransitionLock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  for (const auto &layoutAnimationConfig : configUpdates) {
    const auto &[tag, type, config, sharedTag, contentFade, callback, followsTarget] = layoutAnimationConfig;

    if (type == LayoutAnimationType::ENTERING) {
      enteringAnimationsForNativeID_[tag] = config;
      continue;
    }
    if (type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID) {
      if (config == nullptr) {
        sharedTransitionsForNativeID_.erase(tag);
        sharedTransitionManager_->nativeIDToName_.erase(tag);
      } else {
        sharedTransitionsForNativeID_[tag] = {
            .animation = config, .contentFade = contentFade, .callback = callback, .followsTarget = followsTarget};
        sharedTransitionManager_->nativeIDToName_[tag] = sharedTag;
      }
      continue;
    }
    if (type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION) {
      if (config == nullptr) {
        sharedTransitions_.erase(tag);
        sharedTransitionManager_->eraseName(tag);
      } else {
        sharedTransitionManager_->setName(tag, sharedTag);
        sharedTransitions_[tag] = {
            .animation = config, .contentFade = contentFade, .callback = callback, .followsTarget = followsTarget};
      }
      continue;
    }
    if (type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS_NATIVE_ID) {
      if (config == nullptr) {
        progressSharedTransitionsForNativeID_.erase(tag);
      } else {
        progressSharedTransitionsForNativeID_[tag] = config;
      }
      continue;
    }
    if (config == nullptr) {
      getConfigsForType(type).erase(tag);
    } else {
      getConfigsForType(type)[tag] = config;
    }
  }
  return lock;
}

void LayoutAnimationsManager::setShouldAnimateExiting(const int tag, const bool value) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  shouldAnimateExitingForTag_[tag] = value;
}

bool LayoutAnimationsManager::shouldAnimateExiting(const int tag, const bool shouldAnimate) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return shouldAnimateExitingForTag_.contains(tag) ? shouldAnimateExitingForTag_[tag] : shouldAnimate;
}

std::shared_ptr<Serializable> LayoutAnimationsManager::getLayoutAnimationConfig(
    const int tag,
    const LayoutAnimationType type) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  const auto &configs = getConfigsForType(type);
  const auto configIt = configs.find(tag);
  return configIt == configs.end() ? nullptr : configIt->second;
}

bool LayoutAnimationsManager::hasLayoutAnimationConfigs(const LayoutAnimationType type) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return !getConfigsForType(type).empty();
}

std::optional<SharedTransitionConfig> LayoutAnimationsManager::getSharedTransitionConfig(const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  const auto it = sharedTransitions_.find(tag);
  return it == sharedTransitions_.end() ? std::nullopt : std::optional(it->second);
}

std::shared_ptr<Serializable> LayoutAnimationsManager::takeExitingAnimationConfigAndClearTag(const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  const auto configIt = exitingAnimations_.find(tag);
  auto config = configIt == exitingAnimations_.end() ? nullptr : configIt->second;
  enteringAnimations_.erase(tag);
  exitingAnimations_.erase(tag);
  layoutAnimations_.erase(tag);
  shouldAnimateExitingForTag_.erase(tag);
  return config;
}

void LayoutAnimationsManager::clearLayoutAnimationConfig(const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  enteringAnimations_.erase(tag);
  exitingAnimations_.erase(tag);
  layoutAnimations_.erase(tag);
  shouldAnimateExitingForTag_.erase(tag);
}

void LayoutAnimationsManager::clearSharedTransitionContentFade(const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  if (const auto it = sharedTransitions_.find(tag); it != sharedTransitions_.end()) {
    it->second.contentFade.reset();
  }
}

void LayoutAnimationsManager::clearSharedTransitionConfigs(const std::vector<Tag> &tags) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  auto sharedTransitionLock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  for (const auto tag : tags) {
    sharedTransitions_.erase(tag);
    progressSharedTransitions_.erase(tag);
    sharedTransitionManager_->eraseName(tag);
  }
}

bool LayoutAnimationsManager::startLayoutAnimation(
    jsi::Runtime &rt,
    const int tag,
    const LayoutAnimationType type,
    const jsi::Object &values,
    const std::shared_ptr<Serializable> &config) {
  react_native_assert(config && "layout animation config is null");
  if (!config) {
    return false;
  }
  const auto configValue = config->toJSValue(rt);
  return callLayoutAnimationsManager(rt, "start", [&](jsi::Runtime &runtime, const jsi::Function &start) {
    start.call(runtime, jsi::Value(tag), jsi::Value(static_cast<int>(type)), values, configValue);
  });
}

jsi::Object LayoutAnimationsManager::captureLiveLayoutLeaves(jsi::Runtime &rt, const LiveLayoutLeaves &liveLeaves) {
  ReanimatedSystraceSection section("LayoutAnimationsManager::captureLiveLayoutLeaves");
  jsi::Object values(rt);
  callLayoutAnimationsManager(
      rt, "captureLiveLeaves", [&](jsi::Runtime &runtime, const jsi::Function &captureLiveLeaves) {
        values = captureLiveLeaves.call(runtime, toJSValue(runtime, liveLeaves)).asObject(runtime);
      });
  return values;
}

jsi::Value LayoutAnimationsManager::buildLayoutAnimation(
    jsi::Runtime &rt,
    const uint64_t buildId,
    const jsi::Object &values,
    const std::shared_ptr<Serializable> &config,
    const NativeLayoutLimits &limits,
    const LiveLayoutLeaves &liveLeaves) {
  ReanimatedSystraceSection section("LayoutAnimationsManager::buildLayoutAnimation");
  const auto configValue = config->toJSValue(rt);
  auto summary = jsi::Value::undefined();
  callLayoutAnimationsManager(rt, "build", [&](jsi::Runtime &runtime, const jsi::Function &build) {
    summary = build.call(
        runtime,
        jsi::Value(static_cast<double>(buildId)),
        values,
        configValue,
        toJSValue(runtime, limits),
        toJSValue(runtime, liveLeaves));
  });
  return summary;
}

bool LayoutAnimationsManager::startBuiltLayoutAnimation(
    jsi::Runtime &rt,
    const int tag,
    const LayoutAnimationType type,
    const uint64_t buildId,
    const LiveLayoutLeaves &liveLeaves) {
  return callLayoutAnimationsManager(rt, "startBuilt", [&](jsi::Runtime &runtime, const jsi::Function &startBuilt) {
    startBuilt.call(
        runtime,
        jsi::Value(tag),
        jsi::Value(static_cast<int>(type)),
        jsi::Value(static_cast<double>(buildId)),
        toJSValue(runtime, liveLeaves));
  });
}

void LayoutAnimationsManager::finishBuiltLayoutAnimation(
    jsi::Runtime &rt,
    const uint64_t buildId,
    const bool finished) {
  ReanimatedSystraceSection section("LayoutAnimationsManager::finishBuiltLayoutAnimation");
  callLayoutAnimationsManager(rt, "finishBuilt", [&](jsi::Runtime &runtime, const jsi::Function &finishBuilt) {
    finishBuilt.call(runtime, jsi::Value(static_cast<double>(buildId)), jsi::Value(finished));
  });
}

void LayoutAnimationsManager::releaseBuiltLayoutAnimation(jsi::Runtime &rt, const uint64_t buildId) {
  ReanimatedSystraceSection section("LayoutAnimationsManager::releaseBuiltLayoutAnimation");
  callLayoutAnimationsManager(rt, "releaseBuilt", [&](jsi::Runtime &runtime, const jsi::Function &releaseBuilt) {
    releaseBuilt.call(runtime, jsi::Value(static_cast<double>(buildId)));
  });
}

void LayoutAnimationsManager::cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const {
  callLayoutAnimationsManager(
      rt, "stop", [&](jsi::Runtime &runtime, const jsi::Function &stop) { stop.call(runtime, jsi::Value(tag)); });
}

jsi::Object LayoutAnimationsManager::toJSValue(jsi::Runtime &rt, const NativeLayoutLimits &limits) {
  jsi::Object object(rt);
  object.setProperty(rt, "leaves", static_cast<double>(limits.leaves));
  object.setProperty(rt, "transformOperations", static_cast<double>(limits.transformOperations));
  object.setProperty(rt, "segments", static_cast<double>(limits.segments));
  return object;
}

jsi::Array LayoutAnimationsManager::toJSValue(jsi::Runtime &rt, const LiveLayoutLeaves &liveLeaves) {
  jsi::Array leaves(rt, liveLeaves.size());
  for (size_t index = 0; index < liveLeaves.size(); ++index) {
    jsi::Object leaf(rt);
    leaf.setProperty(rt, "buildId", static_cast<double>(liveLeaves[index].buildId));
    leaf.setProperty(rt, "key", jsi::String::createFromUtf8(rt, liveLeaves[index].key));
    leaves.setValueAtIndex(rt, index, std::move(leaf));
  }
  return leaves;
}

bool LayoutAnimationsManager::callLayoutAnimationsManager(
    jsi::Runtime &rt,
    const char *methodName,
    const std::function<void(jsi::Runtime &, const jsi::Function &)> &call) {
  return runGuardedOnUIRuntime(rt, methodName, [&](jsi::Runtime &runtime) {
    const auto method = runtime.global()
                            .getPropertyAsObject(runtime, "global")
                            .getPropertyAsObject(runtime, "LayoutAnimationsManager")
                            .getPropertyAsFunction(runtime, methodName);
    call(runtime, method);
  });
}

bool LayoutAnimationsManager::runGuardedOnUIRuntime(
    jsi::Runtime &rt,
    const char *name,
    const std::function<void(jsi::Runtime &)> &call) {
  const auto uiRuntime = worklets::getWeakRuntimeFromJSIRuntime(rt).lock();
  if (!uiRuntime) {
    return false;
  }
  bool completed = false;
  const auto guardedCall = jsi::Function::createFromHostFunction(
      rt,
      jsi::PropNameID::forAscii(rt, name),
      0,
      [&](jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *, size_t) {
        call(runtime);
        completed = true;
        return jsi::Value::undefined();
      });
  worklets::runSyncOnRuntime(uiRuntime, guardedCall);
  return completed;
}

void LayoutAnimationsManager::transferConfigFromNativeID(const int nativeId, const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  auto sharedTransitionLock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  const auto config = enteringAnimationsForNativeID_[nativeId];
  if (config) {
    enteringAnimations_.insert_or_assign(tag, config);
  }
  enteringAnimationsForNativeID_.erase(nativeId);

  const auto sharedTransitionConfig = sharedTransitionsForNativeID_[nativeId];
  if (sharedTransitionConfig.animation) {
    sharedTransitionManager_->setName(tag, sharedTransitionManager_->nativeIDToName_[nativeId]);
    sharedTransitions_.insert_or_assign(tag, sharedTransitionConfig);
  }
  sharedTransitionsForNativeID_.erase(nativeId);
  sharedTransitionManager_->nativeIDToName_.erase(nativeId);

  // Transfer progress shared transition config from nativeId to view tag
  const auto progressConfig = progressSharedTransitionsForNativeID_[nativeId];
  if (progressConfig) {
    progressSharedTransitions_.insert_or_assign(tag, progressConfig);
  }
  progressSharedTransitionsForNativeID_.erase(nativeId);
}

std::shared_ptr<SharedTransitionManager> LayoutAnimationsManager::getSharedTransitionManager() {
  return sharedTransitionManager_;
}

std::unordered_map<int, std::shared_ptr<Serializable>> &LayoutAnimationsManager::getConfigsForType(
    const LayoutAnimationType type) {
  switch (type) {
    case LayoutAnimationType::ENTERING:
      return enteringAnimations_;
    case LayoutAnimationType::EXITING:
      return exitingAnimations_;
    case LayoutAnimationType::LAYOUT:
      return layoutAnimations_;
    case LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS:
      return progressSharedTransitions_;
    default:
      throw std::invalid_argument("[Reanimated] Unknown layout animation type");
  }
}

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
ContainerSizes LayoutAnimationsManager::containerSizes() {
  ContainerSizes sizes;
  {
    const std::lock_guard lock(animationsMutex_);
    sizes = {
        {"enteringAnimationsForNativeID", enteringAnimationsForNativeID_.size()},
        {"sharedTransitionsForNativeID", sharedTransitionsForNativeID_.size()},
        {"sharedTransitions", sharedTransitions_.size()},
        {"enteringAnimations", enteringAnimations_.size()},
        {"exitingAnimations", exitingAnimations_.size()},
        {"layoutAnimations", layoutAnimations_.size()},
        {"shouldAnimateExitingForTag", shouldAnimateExitingForTag_.size()}};
  }
  const std::lock_guard lock(pendingConfigUpdatesMutex_);
  sizes.emplace("pendingConfigUpdates", pendingConfigUpdates_.size());
  return sizes;
}
#endif

} // namespace reanimated
