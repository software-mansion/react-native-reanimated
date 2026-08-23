#include <reanimated/LayoutAnimations/LayoutNativeAnimationAdapter.h>

#include <algorithm>
#include <cmath>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated {

namespace {

using namespace native_animation;

// Host-state tolerance from the semantic contract.
constexpr double kEndpointTolerance = 0.01;

struct LayoutTargetMapping {
  AnimationTargetKind kind;
  // Added to frame-origin values to reach the layer center position that the
  // platform animates.
  double valueOffset;
  // The value Fabric mounted for this property, in builder units.
  double mountedValue;
  // The start value in layer units when the request takes over a writer.
  std::optional<double> takeoverStart;
};

std::optional<LayoutTargetMapping> targetForProperty(
    const std::string &property,
    const LayoutNativeConversionContext &context) {
  // Only targets the platform host realizes correctly route natively.
  // Objectives 10 and 11 extend this set.
  const auto &takeover = context.takeoverStart;
  if (property == "opacity") {
    return LayoutTargetMapping{
        AnimationTargetKind::Opacity,
        0,
        context.finalOpacity,
        takeover ? std::optional<double>{takeover->opacity} : std::nullopt};
  }
  if (property == "originX") {
    return LayoutTargetMapping{
        AnimationTargetKind::PositionX,
        context.finalWidth / 2,
        context.finalOriginX,
        takeover ? std::optional<double>{takeover->positionX} : std::nullopt};
  }
  if (property == "originY") {
    return LayoutTargetMapping{
        AnimationTargetKind::PositionY,
        context.finalHeight / 2,
        context.finalOriginY,
        takeover ? std::optional<double>{takeover->positionY} : std::nullopt};
  }
  return std::nullopt;
}

TrackBuildResult buildLayoutTrack(
    const LayoutNativeAnimatedProperty &property,
    const LayoutNativeConversionContext &context,
    NativeAnimationResourceUsage &usage) {
  const auto mapping = targetForProperty(property.property, context);
  if (!mapping) {
    return TrackBuildFailure{TrackBuildFailureReason::UnsupportedTarget};
  }
  const auto *timingLeaf = std::get_if<LayoutNativeTimingLeaf>(&property.leaf);
  if (timingLeaf == nullptr) {
    return TrackBuildFailure{TrackBuildFailureReason::UnsupportedTrackForm};
  }
  if (!timingLeaf->easing) {
    // A deterministic curve without common timing data needs the sampled route
    // that Objective 12 adds.
    return TrackBuildFailure{TrackBuildFailureReason::UnsupportedTiming};
  }
  if (!isFinite(*timingLeaf->easing) || !hasOrderedTimingPoints(*timingLeaf->easing)) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }
  if (const auto *bezier = std::get_if<CubicBezier>(&*timingLeaf->easing);
      bezier != nullptr && (bezier->x1 < 0 || bezier->x1 > 1 || bezier->x2 < 0 || bezier->x2 > 1)) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }
  if (!supportsTiming(context.formSupport, *timingLeaf->easing) || context.formSupport.maxSegmentsPerTrack < 1) {
    return TrackBuildFailure{TrackBuildFailureReason::UnsupportedTiming};
  }
  if (!property.initialValue) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }
  if (!std::isfinite(property.delayMs) || !std::isfinite(timingLeaf->durationMs)) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }
  // Frame-driven runs a negative delay or duration at once, so both clamp to
  // zero.
  const double delayMs = std::max(property.delayMs, 0.0);
  const double durationMs = std::max(timingLeaf->durationMs, 0.0);

  AnimationTrack track{
      {mapping->kind},
      AnimationValue{mapping->takeoverStart.value_or(*property.initialValue + mapping->valueOffset)},
      {{1.0, AnimationValue{timingLeaf->toValue + mapping->valueOffset}, *timingLeaf->easing}},
      delayMs,
      durationMs,
  };
  auto built = buildAnimationTrack(std::move(track));
  if (std::holds_alternative<TrackBuildFailure>(built)) {
    return built;
  }
  if (std::abs(timingLeaf->toValue - mapping->mountedValue) > kEndpointTolerance) {
    return TrackBuildFailure{TrackBuildFailureReason::EndpointMismatch};
  }
  if (!accumulateTrackUsage(std::get<AnimationTrack>(built), context.budget, usage)) {
    return TrackBuildFailure{TrackBuildFailureReason::ResourceLimit};
  }
  return built;
}

} // namespace

std::vector<AnimationTargetClaim> frameDrivenClaimTargets(
    const LayoutNativeAnimationBuildInput &input,
    const LayoutAnimationType type) {
  // A frame write that changes the size also moves the layer position, so
  // width and height claim their position axis too.
  static const std::unordered_map<std::string, std::vector<AnimationTargetKind>> targetsByKey = {
      {"opacity", {AnimationTargetKind::Opacity}},
      {"originX", {AnimationTargetKind::PositionX}},
      {"originY", {AnimationTargetKind::PositionY}},
      {"width", {AnimationTargetKind::Width, AnimationTargetKind::PositionX}},
      {"height", {AnimationTargetKind::Height, AnimationTargetKind::PositionY}},
      {"transform", {AnimationTargetKind::Transform}},
      {"backgroundColor", {AnimationTargetKind::BackgroundColor}},
      {"borderColor", {AnimationTargetKind::BorderColor}},
      {"borderRadius", {AnimationTargetKind::BorderRadius}},
      {"borderWidth", {AnimationTargetKind::BorderWidth}},
      {"shadowColor", {AnimationTargetKind::ShadowColor}},
      {"shadowOpacity", {AnimationTargetKind::ShadowOpacity}},
      {"shadowRadius", {AnimationTargetKind::ShadowRadius}},
      {"shadowOffset", {AnimationTargetKind::ShadowOffset}},
  };
  std::vector<AnimationTargetClaim> claims;
  const auto claim = [&](const std::string &key) {
    const auto it = targetsByKey.find(key);
    if (it == targetsByKey.end()) {
      claims.assign({AllVisualTargets{}});
      return false;
    }
    for (const auto kind : it->second) {
      const AnimationTargetClaim target = AnimationTarget{kind};
      if (std::ranges::find(claims, target) == claims.end()) {
        claims.push_back(target);
      }
    }
    return true;
  };
  for (const auto &property : input.properties) {
    if (!claim(property.property)) {
      return claims;
    }
  }
  for (const auto &key : input.initialOnlyKeys) {
    if (!claim(key)) {
      return claims;
    }
  }
  if (type == LayoutAnimationType::ENTERING) {
    claim("opacity");
  }
  return claims;
}

LayoutPlanBuildResult buildLayoutNativeAnimationPlan(
    const LayoutNativeAnimationBuildInput &input,
    const LayoutNativeConversionContext &context) {
  if (input.properties.empty() || !input.initialOnlyKeys.empty()) {
    return native_animation::TrackBuildFailure{native_animation::TrackBuildFailureReason::UnsupportedTrackForm};
  }
  native_animation::NativeAnimationResourceUsage usage;
  native_animation::AnimationPlan plan;
  plan.tracks.reserve(input.properties.size());
  for (const auto &property : input.properties) {
    auto result = buildLayoutTrack(property, context, usage);
    if (const auto *failure = std::get_if<native_animation::TrackBuildFailure>(&result)) {
      return *failure;
    }
    plan.tracks.push_back(std::move(std::get<native_animation::AnimationTrack>(result)));
  }
  return plan;
}

LayoutNativeAnimationAdapter::LayoutNativeAnimationAdapter(
    std::shared_ptr<native_animation::NativeAnimationService> service,
    native_animation::CallbackScheduler callbackScheduler)
    : service_(std::move(service)), callbackScheduler_(std::move(callbackScheduler)) {}

void LayoutNativeAnimationAdapter::claimFrameDriven(
    native_animation::ExternalClaimRequest request,
    native_animation::ExternalClaimCallbacks callbacks) const {
  callbacks.driver.scheduler = callbackScheduler_;
  service_->claimExternal(std::move(request), std::move(callbacks));
}

void LayoutNativeAnimationAdapter::releaseFrameDriven(
    const native_animation::AnimationHandle handle,
    const native_animation::AnimationOutcome outcome) const {
  service_->releaseExternal(handle, outcome);
}

void LayoutNativeAnimationAdapter::cancel(const native_animation::AnimationHandle handle) const {
  service_->cancel(handle);
}

} // namespace reanimated
