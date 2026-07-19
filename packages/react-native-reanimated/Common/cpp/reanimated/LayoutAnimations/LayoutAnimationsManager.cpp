#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h>
// LayoutAnimationTrace start
#ifndef NDEBUG
#include <reanimated/LayoutAnimations/LayoutAnimationTraceInstrumentation.h>
#endif // NDEBUG
// LayoutAnimationTrace end

#include <algorithm>
#include <cmath>
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
    const size_t offsetCount = offsets.size(rt);
    const size_t valueCount = values.size(rt);
    parsedProperty.offsets.reserve(offsetCount);
    parsedProperty.values.reserve(valueCount);
    for (size_t j = 0; j < offsetCount; j++) {
      parsedProperty.offsets.push_back(offsets.getValueAtIndex(rt, j).asNumber());
    }
    for (size_t j = 0; j < valueCount; j++) {
      parsedProperty.values.push_back(values.getValueAtIndex(rt, j).asNumber());
    }

    descriptor.properties.push_back(std::move(parsedProperty));
  }

  return descriptor;
}

static bool isValidNativeDescriptor(const NativeLayoutAnimationDescriptor &descriptor) {
  if (!std::isfinite(descriptor.durationMs) || descriptor.durationMs < 0 || descriptor.properties.empty()) {
    return false;
  }
  static const std::unordered_set<std::string> supportedTargets = {
      "opacity",
      "originX",
      "originY",
      "width",
      "height",
      "translateX",
      "translateY",
      "scaleX",
      "scaleY",
      "rotation",
      "rotationX",
      "rotationY",
      "skewX",
      "perspective"};
  for (const auto &property : descriptor.properties) {
    if (!supportedTargets.contains(property.keyPath) || property.offsets.empty() ||
        property.offsets.size() != property.values.size()) {
      return false;
    }
    double previous = -1;
    for (size_t index = 0; index < property.offsets.size(); index++) {
      const double offset = property.offsets[index];
      if (!std::isfinite(offset) || !std::isfinite(property.values[index]) || offset < 0 || offset > 1 ||
          offset < previous) {
        return false;
      }
      previous = offset;
    }
  }
  return true;
}

void LayoutAnimationsManager::startNativeLayoutAnimation(
    jsi::Runtime &rt,
    const int tag,
    const LayoutAnimationType type,
    const jsi::Object &values,
    const bool usePresentationLayer,
    const bool shouldRemove) {
  auto &animationsForTag = nativeAnimations_[tag];
  NativeLayoutAnimationHandle handle{tag, ++animationsForTag.nextGeneration};
  auto cancellationToken = std::make_shared<std::atomic_bool>(false);
  animationsForTag.active.push_back({handle, cancellationToken, 0, shouldRemove});

  if (!runNativeLayoutAnimation_) {
    finishNativeLayoutAnimation(rt, handle, false);
    return;
  }

  LayoutAnimationConfigEntry configPair;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
    if (!getConfigsForType(type).contains(tag)) {
      finishNativeLayoutAnimation(rt, handle, false);
      return;
    }
    configPair = getConfigsForType(type)[tag];
  }

  if (!configPair.first) {
    finishNativeLayoutAnimation(rt, handle, false);
    return;
  }

  // Ask JS to run the preset builder for these runtime values and sample it into
  // a generic keyframe descriptor (the same animation objects the legacy path
  // would have driven frame-by-frame).
  NativeLayoutAnimationDescriptor descriptor;
  try {
    jsi::Object layoutAnimationsManager =
        rt.global().getPropertyAsObject(rt, "global").getPropertyAsObject(rt, "LayoutAnimationsManager");
    jsi::Function computeNativeDescriptor =
        layoutAnimationsManager.getPropertyAsFunction(rt, "computeNativeDescriptor");
    jsi::Value descriptorValue = computeNativeDescriptor.call(
        rt,
        jsi::Value(tag),
        jsi::Value(static_cast<double>(handle.generation)),
        jsi::Value(static_cast<int>(type)),
        values,
        configPair.first->toJSValue(rt));
    descriptor = parseNativeDescriptor(rt, descriptorValue.asObject(rt));
  } catch (...) {
    finishNativeLayoutAnimation(rt, handle, false);
    return;
  }

  if (!isValidNativeDescriptor(descriptor)) {
    finishNativeLayoutAnimation(rt, handle, false);
    return;
  }

  const auto targets = getNativeLayoutAnimationTargets(descriptor);
  std::vector<NativeLayoutAnimationHandle> conflicts;
  for (const auto &active : animationsForTag.active) {
    if (active.handle.generation != handle.generation && (active.targets & targets) != 0) {
      conflicts.push_back(active.handle);
    }
  }
  for (const auto conflict : conflicts) {
    cancelNativeLayoutAnimationHandle(rt, conflict);
  }
  auto &active = nativeAnimations_[tag].active;
  const auto current = std::find_if(active.begin(), active.end(), [handle](const auto &animation) {
    return animation.handle.generation == handle.generation;
  });
  if (current == active.end()) {
    return;
  }
  current->targets = targets;

  // LayoutAnimationTrace start
#ifndef NDEBUG
  layout_animation_trace::recordNativeDescriptor(tag, type, descriptor);
#endif // NDEBUG
  // LayoutAnimationTrace end

  submitNativeLayoutAnimationStart(
      handle,
      descriptor,
      usePresentationLayer,
      cancellationToken,
      [weakThis = weak_from_this(), &rt, handle](bool finished) {
        if (auto strongThis = weakThis.lock()) {
          strongThis->finishNativeLayoutAnimation(rt, handle, finished);
        }
      });
}

void LayoutAnimationsManager::submitNativeLayoutAnimationStart(
    NativeLayoutAnimationHandle handle,
    const NativeLayoutAnimationDescriptor &descriptor,
    bool usePresentationLayer,
    NativeLayoutAnimationCancellationToken cancellationToken,
    std::function<void(bool)> &&completion) {
  // LayoutAnimationTrace start
#ifndef NDEBUG
  if (nativeLayoutAnimationStartPaused_) {
    pendingNativeLayoutAnimationStarts_.push_back(
        {handle, descriptor, usePresentationLayer, std::move(cancellationToken), std::move(completion)});
    return;
  }
#endif
  // LayoutAnimationTrace end
  runNativeLayoutAnimation_(
      handle, descriptor, usePresentationLayer, std::move(cancellationToken), std::move(completion));
}

// LayoutAnimationTrace start
#ifndef NDEBUG
void LayoutAnimationsManager::setNativeLayoutAnimationStartPaused(bool paused) {
  nativeLayoutAnimationStartPaused_ = paused;
  if (paused) {
    return;
  }
  auto pendingStarts = std::move(pendingNativeLayoutAnimationStarts_);
  pendingNativeLayoutAnimationStarts_.clear();
  for (auto &pending : pendingStarts) {
    runNativeLayoutAnimation_(
        pending.handle,
        pending.descriptor,
        pending.usePresentationLayer,
        std::move(pending.cancellationToken),
        std::move(pending.completion));
  }
}
#endif
// LayoutAnimationTrace end

void LayoutAnimationsManager::finishNativeLayoutAnimation(
    jsi::Runtime &rt,
    NativeLayoutAnimationHandle handle,
    bool finished) {
  auto animationsForTag = nativeAnimations_.find(handle.tag);
  if (animationsForTag == nativeAnimations_.end()) {
    return;
  }
  auto &active = animationsForTag->second.active;
  const auto animation = std::find_if(active.begin(), active.end(), [handle](const auto &candidate) {
    return candidate.handle.generation == handle.generation;
  });
  if (animation == active.end()) {
    return;
  }
  const bool shouldRemove = animation->shouldRemoveOnTermination;

  if (shouldRemove) {
    std::vector<NativeLayoutAnimationHandle> others;
    for (const auto &candidate : active) {
      if (candidate.handle.generation != handle.generation) {
        others.push_back(candidate.handle);
      }
    }
    for (const auto other : others) {
      cancelNativeLayoutAnimationHandle(rt, other);
    }
  }
  auto &remaining = nativeAnimations_[handle.tag].active;
  remaining.erase(
      std::remove_if(
          remaining.begin(),
          remaining.end(),
          [handle](const auto &candidate) { return candidate.handle.generation == handle.generation; }),
      remaining.end());

  jsi::Object manager =
      rt.global().getPropertyAsObject(rt, "global").getPropertyAsObject(rt, "LayoutAnimationsManager");
  manager.getPropertyAsFunction(rt, "completeNative")
      .call(rt, jsi::Value(handle.tag), jsi::Value(static_cast<double>(handle.generation)), jsi::Value(finished));
  if (nativeLayoutAnimationCompletionHandler_) {
    nativeLayoutAnimationCompletionHandler_(handle, shouldRemove);
  }
}

void LayoutAnimationsManager::cancelNativeLayoutAnimationHandle(jsi::Runtime &rt, NativeLayoutAnimationHandle handle) {
  if (const auto animations = nativeAnimations_.find(handle.tag); animations != nativeAnimations_.end()) {
    const auto animation = std::find_if(
        animations->second.active.begin(), animations->second.active.end(), [handle](const auto &candidate) {
          return candidate.handle.generation == handle.generation;
        });
    if (animation != animations->second.active.end()) {
      animation->cancellationToken->store(true, std::memory_order_release);
    }
  }
  if (cancelNativeLayoutAnimation_) {
    cancelNativeLayoutAnimation_(handle);
  }
  finishNativeLayoutAnimation(rt, handle, false);
}

void LayoutAnimationsManager::cancelLayoutAnimation(jsi::Runtime &rt, const int tag) {
  if (const auto animations = nativeAnimations_.find(tag);
      animations != nativeAnimations_.end() && !animations->second.active.empty()) {
    auto handles = animations->second.active;
    // Non-removing handles must complete first. If an exit is present, its
    // terminal event completes last and requests retained-view cleanup.
    std::stable_sort(handles.begin(), handles.end(), [](const auto &lhs, const auto &rhs) {
      return !lhs.shouldRemoveOnTermination && rhs.shouldRemoveOnTermination;
    });
    for (const auto &animation : handles) {
      cancelNativeLayoutAnimationHandle(rt, animation.handle);
    }
    return;
  }
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
