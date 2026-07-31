#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/NativeAnimations/NativeAnimationCompilation.h>
// LayoutAnimationTrace start
#ifndef NDEBUG
#include <reanimated/LayoutAnimations/LayoutAnimationTraceInstrumentation.h>
#endif // NDEBUG
// LayoutAnimationTrace end

#include <algorithm>
#include <cmath>
#include <memory>
#include <stdexcept>
#include <unordered_map>
#include <utility>
#include <variant>
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

static NativeAnimationTarget parseNativeTarget(const std::string &target) {
  static const std::unordered_map<std::string, NativeAnimationTarget> targets = {
      {"opacity", NativeAnimationTarget::Opacity},
      {"originX", NativeAnimationTarget::OriginX},
      {"originY", NativeAnimationTarget::OriginY},
      {"width", NativeAnimationTarget::Width},
      {"height", NativeAnimationTarget::Height},
      {"translateX", NativeAnimationTarget::TranslateX},
      {"translateY", NativeAnimationTarget::TranslateY},
      {"scaleX", NativeAnimationTarget::ScaleX},
      {"scaleY", NativeAnimationTarget::ScaleY},
      {"rotation", NativeAnimationTarget::Rotation},
      {"rotationX", NativeAnimationTarget::RotationX},
      {"rotationY", NativeAnimationTarget::RotationY},
      {"skewX", NativeAnimationTarget::SkewX},
      {"skewY", NativeAnimationTarget::SkewY},
      {"perspective", NativeAnimationTarget::Perspective},
      {"transform", NativeAnimationTarget::Transform},
  };
  const auto result = targets.find(target);
  if (result == targets.end()) {
    throw std::invalid_argument("Unsupported native animation target");
  }
  return result->second;
}

static NativeAnimationRoute parseNativeRoute(const std::string &route) {
  if (route == "simple") {
    return NativeAnimationRoute::Simple;
  }
  if (route == "structured") {
    return NativeAnimationRoute::Structured;
  }
  if (route == "sampled") {
    return NativeAnimationRoute::Sampled;
  }
  throw std::invalid_argument("Unsupported native animation route");
}

static NativeAnimationRouteReason parseNativeRouteReason(const std::string &reason) {
  if (reason == "canonical-single-timing") {
    return NativeAnimationRouteReason::CanonicalSingleTiming;
  }
  if (reason == "contains-hold-or-sequence") {
    return NativeAnimationRouteReason::ContainsHoldOrSequence;
  }
  if (reason == "requires-sampling") {
    return NativeAnimationRouteReason::RequiresSampling;
  }
  if (reason == "unsupported-property") {
    return NativeAnimationRouteReason::UnsupportedProperty;
  }
  if (reason == "unsupported-value-type") {
    return NativeAnimationRouteReason::UnsupportedValueType;
  }
  if (reason == "transform-ordering-unavailable") {
    return NativeAnimationRouteReason::TransformOrderingUnavailable;
  }
  return NativeAnimationRouteReason::InvalidInput;
}

static std::vector<double> parseNumberArray(jsi::Runtime &rt, const jsi::Object &object, const char *propertyName) {
  const auto array = object.getProperty(rt, propertyName).asObject(rt).asArray(rt);
  std::vector<double> values;
  values.reserve(array.size(rt));
  for (size_t index = 0; index < array.size(rt); index++) {
    values.push_back(array.getValueAtIndex(rt, index).asNumber());
  }
  return values;
}

static NativeTimingFunction parseNativeEasing(jsi::Runtime &rt, const jsi::Object &segment) {
  const auto easing = segment.getProperty(rt, "easing").asObject(rt);
  const auto kind = easing.getProperty(rt, "kind").asString(rt).utf8(rt);
  if (kind == "linear") {
    return {};
  }
  if (kind == "cubicBezier") {
    const auto points = parseNumberArray(rt, easing, "controlPoints");
    if (points.size() != 4) {
      throw std::invalid_argument("Invalid cubic bezier");
    }
    return {
        .kind = NativeTimingFunctionKind::CubicBezier, .controlPoints = {points[0], points[1], points[2], points[3]}};
  }
  throw std::invalid_argument("Unsupported native easing");
}

static NativeValue parseNativeValue(jsi::Runtime &rt, const jsi::Value &value, const NativeAnimationTarget target) {
  if (value.isNumber()) {
    return value.asNumber();
  }
  if (target != NativeAnimationTarget::Transform || !value.isObject() || !value.asObject(rt).isArray(rt)) {
    throw std::invalid_argument("Unsupported native animation value");
  }
  const auto matrix = value.asObject(rt).asArray(rt);
  if (matrix.size(rt) != 16) {
    throw std::invalid_argument("Invalid native transform matrix");
  }
  NativeMatrix4 result;
  for (size_t index = 0; index < result.values.size(); index++) {
    result.values[index] = matrix.getValueAtIndex(rt, index).asNumber();
  }
  return result;
}

static NativeAnimationSegment
parseNativeSegment(jsi::Runtime &rt, const jsi::Object &segment, const NativeAnimationTarget target) {
  const auto kind = segment.getProperty(rt, "kind").asString(rt).utf8(rt);
  if (kind == "timing") {
    return NativeTimingSegment{
        .startMs = segment.getProperty(rt, "startMs").asNumber(),
        .endMs = segment.getProperty(rt, "endMs").asNumber(),
        .from = parseNativeValue(rt, segment.getProperty(rt, "from"), target),
        .to = parseNativeValue(rt, segment.getProperty(rt, "to"), target),
        .easing = parseNativeEasing(rt, segment)};
  }
  if (kind == "hold") {
    return NativeHoldSegment{
        .startMs = segment.getProperty(rt, "startMs").asNumber(),
        .endMs = segment.getProperty(rt, "endMs").asNumber(),
        .value = parseNativeValue(rt, segment.getProperty(rt, "value"), target)};
  }
  if (kind == "keyframes") {
    NativeKeyframeSegment keyframes;
    keyframes.timesMs = parseNumberArray(rt, segment, "timesMs");
    const auto values = segment.getProperty(rt, "values").asObject(rt).asArray(rt);
    keyframes.values.reserve(values.size(rt));
    for (size_t index = 0; index < values.size(rt); index++) {
      keyframes.values.push_back(parseNativeValue(rt, values.getValueAtIndex(rt, index), target));
    }
    return keyframes;
  }
  throw std::invalid_argument("Unsupported native animation segment");
}

static NativeCompilationResult parseNativeCompilation(
    jsi::Runtime &rt,
    const jsi::Object &compilation,
    const NativeAnimationStartValueSource startValueSource,
    const NativeAnimationMountingMode mountingMode,
    const NativeAnimationLifecycle lifecycle) {
  const auto status = compilation.getProperty(rt, "status").asString(rt).utf8(rt);
  const auto reason = parseNativeRouteReason(compilation.getProperty(rt, "reason").asString(rt).utf8(rt));
  if (status != "native") {
    return {
        status == "fallback" ? NativeCompilationStatus::Fallback : NativeCompilationStatus::Invalid,
        std::nullopt,
        reason};
  }

  const auto planObject = compilation.getProperty(rt, "plan").asObject(rt);
  NativeAnimationPlan plan{
      .totalDurationMs = planObject.getProperty(rt, "totalDurationMs").asNumber(),
      .tracks = {},
      .route = parseNativeRoute(planObject.getProperty(rt, "route").asString(rt).utf8(rt)),
      .routeReason = reason,
      .startValueSource = startValueSource,
      .mountingMode = mountingMode,
      .lifecycle = lifecycle,
      .finalGeometry = std::nullopt};
  if (planObject.hasProperty(rt, "finalGeometry")) {
    const auto geometry = planObject.getProperty(rt, "finalGeometry").asObject(rt);
    plan.finalGeometry = NativeLayoutGeometry{
        .originX = geometry.getProperty(rt, "originX").asNumber(),
        .originY = geometry.getProperty(rt, "originY").asNumber(),
        .width = geometry.getProperty(rt, "width").asNumber(),
        .height = geometry.getProperty(rt, "height").asNumber()};
  }
  const auto tracks = planObject.getProperty(rt, "tracks").asObject(rt).asArray(rt);
  plan.tracks.reserve(tracks.size(rt));
  for (size_t trackIndex = 0; trackIndex < tracks.size(rt); trackIndex++) {
    const auto trackObject = tracks.getValueAtIndex(rt, trackIndex).asObject(rt);
    NativeAnimationTrack track{
        .target = parseNativeTarget(trackObject.getProperty(rt, "target").asString(rt).utf8(rt)), .segments = {}};
    const auto segments = trackObject.getProperty(rt, "segments").asObject(rt).asArray(rt);
    track.segments.reserve(segments.size(rt));
    for (size_t segmentIndex = 0; segmentIndex < segments.size(rt); segmentIndex++) {
      track.segments.push_back(
          parseNativeSegment(rt, segments.getValueAtIndex(rt, segmentIndex).asObject(rt), track.target));
    }
    plan.tracks.push_back(std::move(track));
  }
  return validateNativeAnimationPlan(std::move(plan));
}

static NativeAnimationLifecycle nativeAnimationLifecycle(const LayoutAnimationType type) {
  switch (type) {
    case LayoutAnimationType::ENTERING:
      return NativeAnimationLifecycle::Entering;
    case LayoutAnimationType::EXITING:
      return NativeAnimationLifecycle::Exiting;
    default:
      return NativeAnimationLifecycle::Layout;
  }
}

void LayoutAnimationsManager::startNativeLayoutAnimation(
    jsi::Runtime &rt,
    const SurfaceId surfaceId,
    const int tag,
    const LayoutAnimationType type,
    const jsi::Object &values,
    const bool usePresentationLayer,
    const bool shouldRemove) {
  const NativeAnimationViewKey viewKey{surfaceId, tag};
  auto &animationsForTag = nativeAnimations_[viewKey];
  NativeLayoutAnimationHandle handle{surfaceId, tag, NativeAnimationOwner::Layout, ++animationsForTag.nextGeneration};
  animationsForTag.active.push_back({handle, 0, shouldRemove});

  const auto fallbackToLegacy = [&]() {
    auto animations = nativeAnimations_.find(viewKey);
    if (animations != nativeAnimations_.end()) {
      auto &active = animations->second.active;
      active.erase(
          std::remove_if(
              active.begin(), active.end(), [handle](const auto &candidate) { return candidate.handle == handle; }),
          active.end());
      if (active.empty()) {
        nativeAnimations_.erase(animations);
      }
    }
    startLayoutAnimation(rt, tag, type, values);
  };

  if (!nativeAnimationExecutor_) {
    fallbackToLegacy();
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

  NativeCompilationResult compilation{
      NativeCompilationStatus::Invalid, std::nullopt, NativeAnimationRouteReason::InvalidInput};
  try {
    jsi::Object layoutAnimationsManager =
        rt.global().getPropertyAsObject(rt, "global").getPropertyAsObject(rt, "LayoutAnimationsManager");
    jsi::Function computeNativePlan = layoutAnimationsManager.getPropertyAsFunction(rt, "computeNativePlan");
    jsi::Value compilationValue = computeNativePlan.call(
        rt,
        jsi::Value(tag),
        jsi::Value(static_cast<double>(handle.generation)),
        jsi::Value(static_cast<int>(type)),
        values,
        configPair.first->toJSValue(rt));
    compilation = parseNativeCompilation(
        rt,
        compilationValue.asObject(rt),
        usePresentationLayer ? NativeAnimationStartValueSource::CurrentVisualValue
                             : NativeAnimationStartValueSource::ExplicitValue,
        shouldRemove ? NativeAnimationMountingMode::RetainedCurrentState : NativeAnimationMountingMode::FinalState,
        nativeAnimationLifecycle(type));
  } catch (...) {
    fallbackToLegacy();
    return;
  }

  if (!compilation.native()) {
    // LayoutAnimationTrace start
#ifndef NDEBUG
    layout_animation_trace::recordNativeFallback(tag, type, compilation.reason);
#endif
    // LayoutAnimationTrace end
    fallbackToLegacy();
    return;
  }
  auto plan = std::move(*compilation.plan);
  const auto capability = nativeAnimationExecutor_->queryCapabilities(plan);
  if (!capability.supported()) {
    // LayoutAnimationTrace start
#ifndef NDEBUG
    layout_animation_trace::recordNativeFallback(tag, type, NativeAnimationRouteReason::ExecutorMissingPrimitive);
#endif
    // LayoutAnimationTrace end
    fallbackToLegacy();
    return;
  }

  NativeLayoutAnimationTargetMask targets = 0;
  for (const auto &track : plan.tracks) {
    switch (track.target) {
      case NativeAnimationTarget::Opacity:
        targets |= targetMask(NativeLayoutAnimationTarget::Opacity);
        break;
      case NativeAnimationTarget::OriginX:
      case NativeAnimationTarget::OriginY:
      case NativeAnimationTarget::Position:
        targets |= targetMask(NativeLayoutAnimationTarget::Position);
        break;
      case NativeAnimationTarget::Width:
      case NativeAnimationTarget::Height:
      case NativeAnimationTarget::BoundsSize:
        targets |= targetMask(NativeLayoutAnimationTarget::BoundsSize);
        break;
      default:
        targets |= targetMask(NativeLayoutAnimationTarget::Transform);
        break;
    }
  }
  auto &active = nativeAnimations_[viewKey].active;
  const auto current = std::find_if(active.begin(), active.end(), [handle](const auto &animation) {
    return animation.handle.generation == handle.generation;
  });
  if (current == active.end()) {
    return;
  }
  current->targets = targets;

  // LayoutAnimationTrace start
#ifndef NDEBUG
  layout_animation_trace::recordNativePlan(tag, type, plan);
#endif // NDEBUG
  // LayoutAnimationTrace end

  submitNativeLayoutAnimationStart(
      handle, std::move(plan), [weakThis = weak_from_this(), &rt, handle](NativeAnimationResult result) {
        if (auto strongThis = weakThis.lock()) {
          strongThis->finishNativeLayoutAnimation(rt, handle, result.finished());
        }
      });
}

void LayoutAnimationsManager::submitNativeLayoutAnimationStart(
    NativeLayoutAnimationHandle handle,
    NativeAnimationPlan plan,
    NativeAnimationCompletion completion) {
  // LayoutAnimationTrace start
#ifndef NDEBUG
  if (nativeLayoutAnimationStartPaused_) {
    pendingNativeLayoutAnimationStarts_.push_back({handle, std::move(plan), std::move(completion)});
    return;
  }
#endif
  // LayoutAnimationTrace end
  const auto animationsForTag = nativeAnimations_.find({handle.surfaceId, handle.tag});
  if (animationsForTag == nativeAnimations_.end()) {
    return;
  }
  const auto animation = std::find_if(
      animationsForTag->second.active.begin(), animationsForTag->second.active.end(), [handle](const auto &candidate) {
        return candidate.handle == handle;
      });
  if (animation == animationsForTag->second.active.end()) {
    return;
  }
  animation->scheduled = true;
  nativeAnimationExecutor_->schedule(handle, std::move(plan), std::move(completion));
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
    submitNativeLayoutAnimationStart(pending.handle, std::move(pending.plan), std::move(pending.completion));
  }
}
#endif
// LayoutAnimationTrace end

void LayoutAnimationsManager::finishNativeLayoutAnimation(
    jsi::Runtime &rt,
    NativeLayoutAnimationHandle handle,
    bool finished) {
  const NativeAnimationViewKey viewKey{handle.surfaceId, handle.tag};
  auto animationsForTag = nativeAnimations_.find(viewKey);
  if (animationsForTag == nativeAnimations_.end()) {
    return;
  }
  auto &active = animationsForTag->second.active;
  const auto animation = std::find_if(
      active.begin(), active.end(), [handle](const auto &candidate) { return candidate.handle == handle; });
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
  auto &remaining = nativeAnimations_[viewKey].active;
  remaining.erase(
      std::remove_if(
          remaining.begin(), remaining.end(), [handle](const auto &candidate) { return candidate.handle == handle; }),
      remaining.end());
  if (remaining.empty()) {
    nativeAnimations_.erase(viewKey);
  }

  jsi::Object manager =
      rt.global().getPropertyAsObject(rt, "global").getPropertyAsObject(rt, "LayoutAnimationsManager");
  manager.getPropertyAsFunction(rt, "completeNative")
      .call(rt, jsi::Value(handle.tag), jsi::Value(static_cast<double>(handle.generation)), jsi::Value(finished));
  if (nativeLayoutAnimationCompletionHandler_) {
    nativeLayoutAnimationCompletionHandler_(handle, shouldRemove);
  }
}

void LayoutAnimationsManager::cancelNativeLayoutAnimationHandle(jsi::Runtime &rt, NativeLayoutAnimationHandle handle) {
  bool scheduled = false;
  if (const auto animations = nativeAnimations_.find({handle.surfaceId, handle.tag});
      animations != nativeAnimations_.end()) {
    const auto animation = std::find_if(
        animations->second.active.begin(), animations->second.active.end(), [handle](const auto &candidate) {
          return candidate.handle == handle;
        });
    if (animation != animations->second.active.end()) {
      scheduled = animation->scheduled;
    }
  }
  if (scheduled && nativeAnimationExecutor_) {
    nativeAnimationExecutor_->cancel(handle, NativeAnimationCancelDisposition::SettleToCommittedModel);
    return;
  }
  finishNativeLayoutAnimation(rt, handle, false);
}

void LayoutAnimationsManager::cancelLayoutAnimation(jsi::Runtime &rt, const int tag) {
  std::vector<ActiveNativeLayoutAnimation> matchingAnimations;
  for (const auto &[viewKey, animations] : nativeAnimations_) {
    if (viewKey.tag == tag) {
      matchingAnimations.insert(matchingAnimations.end(), animations.active.begin(), animations.active.end());
    }
  }
  if (!matchingAnimations.empty()) {
    // Non-removing handles must complete first. If an exit is present, its
    // terminal event completes last and requests retained-view cleanup.
    std::stable_sort(matchingAnimations.begin(), matchingAnimations.end(), [](const auto &lhs, const auto &rhs) {
      return !lhs.shouldRemoveOnTermination && rhs.shouldRemoveOnTermination;
    });
    for (const auto &animation : matchingAnimations) {
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
