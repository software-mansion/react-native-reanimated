#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>

#include <react/debug/react_native_assert.h>

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

void LayoutAnimationsManager::cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const {
  callLayoutAnimationsManager(
      rt, "stop", [&](jsi::Runtime &runtime, const jsi::Function &stop) { stop.call(runtime, jsi::Value(tag)); });
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

} // namespace reanimated
