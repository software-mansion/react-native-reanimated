#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h>
// LayoutAnimationTrace start
#ifndef NDEBUG
#include <reanimated/LayoutAnimations/LayoutAnimationTraceInstrumentation.h>
#endif // NDEBUG
// LayoutAnimationTrace end

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

void LayoutAnimationsManager::configureAnimationBatch(const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  for (const auto &layoutAnimationConfig : layoutAnimationsBatch) {
    const auto tag = layoutAnimationConfig.tag;
    const auto type = layoutAnimationConfig.type;
    const auto &config = layoutAnimationConfig.config;
    const auto &rawConfig = layoutAnimationConfig.rawConfig;
    const auto &sharedTag = layoutAnimationConfig.sharedTransitionTag;

    // LayoutAnimationTrace start
#ifndef NDEBUG
    layout_animation_trace::recordConfigurationStored(tag, type, config != nullptr);
#endif // NDEBUG
    // LayoutAnimationTrace end

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

static NativeLayoutAnimationDescriptor parseNativeDescriptor(jsi::Runtime &rt, const jsi::Object &descriptorObj) {
  NativeLayoutAnimationDescriptor descriptor;
  descriptor.durationMs = descriptorObj.getProperty(rt, "durationMs").asNumber();

  jsi::Array properties = descriptorObj.getProperty(rt, "properties").asObject(rt).asArray(rt);
  const size_t propertyCount = properties.size(rt);
  descriptor.properties.reserve(propertyCount);

  for (size_t i = 0; i < propertyCount; i++) {
    jsi::Object property = properties.getValueAtIndex(rt, i).asObject(rt);

    NativeLayoutAnimationProperty parsedProperty;
    parsedProperty.keyPath = property.getProperty(rt, "keyPath").asString(rt).utf8(rt);

    jsi::Array offsets = property.getProperty(rt, "offsets").asObject(rt).asArray(rt);
    jsi::Array values = property.getProperty(rt, "values").asObject(rt).asArray(rt);
    const size_t keyframeCount = offsets.size(rt);
    parsedProperty.offsets.reserve(keyframeCount);
    parsedProperty.values.reserve(keyframeCount);
    for (size_t j = 0; j < keyframeCount; j++) {
      parsedProperty.offsets.push_back(offsets.getValueAtIndex(rt, j).asNumber());
      parsedProperty.values.push_back(values.getValueAtIndex(rt, j).asNumber());
    }

    descriptor.properties.push_back(std::move(parsedProperty));
  }

  return descriptor;
}

void LayoutAnimationsManager::startNativeLayoutAnimation(
    jsi::Runtime &rt,
    const int tag,
    const LayoutAnimationType type,
    const jsi::Object &values,
    const bool usePresentationLayer,
    std::function<void(bool)> &&onAnimationEnd) {
  if (!runNativeLayoutAnimation_) {
    onAnimationEnd(true);
    return;
  }

  LayoutAnimationConfigEntry configPair;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
    if (!getConfigsForType(type).contains(tag)) {
      onAnimationEnd(true);
      return;
    }
    configPair = getConfigsForType(type)[tag];
  }

  if (!configPair.first) {
    onAnimationEnd(true);
    return;
  }

  // Ask JS to run the preset builder for these runtime values and sample it into
  // a generic keyframe descriptor (the same animation objects the legacy path
  // would have driven frame-by-frame).
  jsi::Object layoutAnimationsManager =
      rt.global().getPropertyAsObject(rt, "global").getPropertyAsObject(rt, "LayoutAnimationsManager");
  jsi::Function computeNativeDescriptor = layoutAnimationsManager.getPropertyAsFunction(rt, "computeNativeDescriptor");
  jsi::Value descriptorValue = computeNativeDescriptor.call(
      rt, jsi::Value(tag), jsi::Value(static_cast<int>(type)), values, configPair.first->toJSValue(rt));

  NativeLayoutAnimationDescriptor descriptor = parseNativeDescriptor(rt, descriptorValue.asObject(rt));

  // LayoutAnimationTrace start
#ifndef NDEBUG
  layout_animation_trace::recordNativeDescriptor(tag, type, descriptor);
#endif // NDEBUG
  // LayoutAnimationTrace end

  runNativeLayoutAnimation_(tag, descriptor, usePresentationLayer, std::move(onAnimationEnd));
}

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
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  sharedTransitions_[to] = sharedTransitions_[from];
}

std::shared_ptr<SharedTransitionManager> LayoutAnimationsManager::getSharedTransitionManager() {
  return sharedTransitionManager_;
}

std::unordered_map<int, LayoutAnimationsManager::LayoutAnimationConfigEntry> &
LayoutAnimationsManager::getConfigsForType(const LayoutAnimationType type) {
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
