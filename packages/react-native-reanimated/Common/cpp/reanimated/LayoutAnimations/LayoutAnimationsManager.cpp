#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/NativeLayoutAnimation.h>
#include <reanimated/LayoutAnimations/NativeLayoutAnimationPresetFactory.h>

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

void LayoutAnimationsManager::configureAnimationBatch(const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  for (const auto &layoutAnimationConfig : layoutAnimationsBatch) {
    const auto &[tag, type, config, rawConfig] = layoutAnimationConfig;
    const auto &sharedTag = layoutAnimationConfig.sharedTransitionTag;

    if (type == LayoutAnimationType::ENTERING) {
      enteringAnimationsForNativeID_[tag] = std::make_pair(config, rawConfig);
      continue;
    }
    if (type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID) {
      sharedTransitionsForNativeID_[tag] = config;
      sharedTransitionManager_->nativeIDToName_[tag] = sharedTag;
      continue;
    }
    if (type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION) {
      if (config == nullptr) {
        sharedTransitions_.erase(tag);
        sharedTransitionManager_->tagToName_.erase(tag);
      } else {
        sharedTransitions_[tag] = config;
        sharedTransitionManager_->tagToName_[tag] = sharedTag;
      }
      continue;
    }
    if (config == nullptr) {
      getConfigsForType(type).erase(tag);
    } else {
      getConfigsForType(type)[tag] = std::make_pair(config, rawConfig);
    }
  }
}

void LayoutAnimationsManager::setShouldAnimateExiting(const int tag, const bool value) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  shouldAnimateExitingForTag_[tag] = value;
}

bool LayoutAnimationsManager::shouldAnimateExiting(const int tag, const bool shouldAnimate) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return shouldAnimateExitingForTag_.contains(tag) ? shouldAnimateExitingForTag_[tag] : shouldAnimate;
}

bool LayoutAnimationsManager::hasLayoutAnimation(const int tag, const LayoutAnimationType type) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return getConfigsForType(type).contains(tag);
}

void LayoutAnimationsManager::clearLayoutAnimationConfig(const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  enteringAnimations_.erase(tag);
  exitingAnimations_.erase(tag);
  layoutAnimations_.erase(tag);
  shouldAnimateExitingForTag_.erase(tag);
}

void LayoutAnimationsManager::startLayoutAnimation(
    jsi::Runtime &rt,
    const int tag,
    const LayoutAnimationType type,
    const jsi::Object &values) {
  LayoutAnimationConfigEntry configPair;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
    if (!getConfigsForType(type).contains(tag)) {
      return;
    }
    configPair = getConfigsForType(type)[tag];
  }

  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global().getPropertyAsObject(rt, "global").getProperty(rt, "LayoutAnimationsManager");
  jsi::Function startAnimationForTag =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(rt, "start");
  startAnimationForTag.call(
      rt, jsi::Value(tag), jsi::Value(static_cast<int>(type)), values, configPair.first->toJSValue(rt));
}

#if __APPLE__
void LayoutAnimationsManager::startNativeLayoutAnimation(
    const int tag,
    const LayoutAnimationType type,
    const facebook::react::Rect &startFrame,
    const facebook::react::Rect &endFrame,
    std::function<void(bool)> &&onAnimationEnd) {
  LayoutAnimationConfigEntry configPair;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
    if (!getConfigsForType(type).contains(tag)) {
      return;
    }
    configPair = getConfigsForType(type)[tag];
  }

  if (!configPair.second || !configPair.second->presetName) {
    return;
  }

  std::vector<NativeLayoutAnimation> animations =
      NativeLayoutAnimationPresetFactory::instance()
          .create(type, *configPair.second->presetName)
          ->calculate(startFrame, endFrame);

  auto callback = std::make_shared<std::function<void(bool)>>(std::move(onAnimationEnd));
  if (type == LayoutAnimationType::ENTERING) {
    facebook::react::Rect initialFrame = startFrame;
    dispatch_async(dispatch_get_main_queue(), ^{
      runCoreAnimationForView_(
          tag,
          initialFrame,
          animations,
          *configPair.second,
          false,
          [callback](bool finished) { (*callback)(finished); });
    });
  } else {
    runCoreAnimationForView_(
        tag,
        startFrame,
        animations,
        *configPair.second,
        true,
        [callback](bool finished) { (*callback)(finished); });
  }
}
#endif

void LayoutAnimationsManager::cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const {
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global().getPropertyAsObject(rt, "global").getProperty(rt, "LayoutAnimationsManager");
  jsi::Function cancelLayoutAnimation =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(rt, "stop");
  cancelLayoutAnimation.call(rt, jsi::Value(tag));
}

void LayoutAnimationsManager::transferConfigFromNativeID(const int nativeId, const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  const auto config = enteringAnimationsForNativeID_[nativeId];
  if (config.first) {
    enteringAnimations_.insert_or_assign(tag, config);
  }
  enteringAnimationsForNativeID_.erase(nativeId);

  const auto sharedTransitionConfig = sharedTransitionsForNativeID_[nativeId];
  if (sharedTransitionConfig) {
    sharedTransitions_.insert_or_assign(tag, sharedTransitionConfig);
    sharedTransitionManager_->tagToName_[tag] = sharedTransitionManager_->nativeIDToName_[nativeId];
  }
  sharedTransitionsForNativeID_.erase(nativeId);
  sharedTransitionManager_->nativeIDToName_.erase(nativeId);
}

void LayoutAnimationsManager::transferSharedConfig(const Tag from, const Tag to) {
  sharedTransitions_[to] = sharedTransitions_[from];
}

std::shared_ptr<SharedTransitionManager> LayoutAnimationsManager::getSharedTransitionManager() {
  return sharedTransitionManager_;
}

std::unordered_map<int, LayoutAnimationsManager::LayoutAnimationConfigEntry> &LayoutAnimationsManager::getConfigsForType(
    const LayoutAnimationType type) {
  switch (type) {
    case LayoutAnimationType::ENTERING:
      return enteringAnimations_;
    case LayoutAnimationType::EXITING:
      return exitingAnimations_;
    case LayoutAnimationType::LAYOUT:
      return layoutAnimations_;
    default:
      throw std::invalid_argument("[Reanimated] Unknown layout animation type");
  }
}

const LayoutAnimationRawConfig LayoutAnimationsManager::extractRawConfigValues(
    jsi::Runtime &rt,
    const jsi::Object &rawConfig) {
  std::optional<std::string> presetName;
  std::optional<LayoutAnimationRawConfigValues> values;

  jsi::Value presetNameProperty = rawConfig.getProperty(rt, "presetName");
  if (presetNameProperty.isUndefined()) {
    presetName = std::nullopt;
  } else {
    presetName = presetNameProperty.asString(rt).utf8(rt);
  }

  jsi::Value configValuesProperty = rawConfig.getProperty(rt, "values");
  if (configValuesProperty.isUndefined()) {
    values = std::nullopt;

    return LayoutAnimationRawConfig({.presetName = presetName, .values = values});
  }

  jsi::Object configValues = configValuesProperty.asObject(rt);

  jsi::Value valueProperty = configValues.getProperty(rt, "duration");
  std::optional<double> duration =
      !valueProperty.isUndefined() ? std::optional<double>(valueProperty.asNumber()) : std::nullopt;

  return LayoutAnimationRawConfig(
      {.presetName = presetName, .values = LayoutAnimationRawConfigValues({.duration = duration})});
}

} // namespace reanimated
