#include <reanimated/LayoutAnimations/LayoutNativeAnimationAdapter.h>

#include <cmath>
#include <utility>

namespace reanimated {

namespace {

using namespace native_animation;

struct LayoutTargetMapping {
  AnimationTargetKind kind;
  // Added to frame-origin values to reach the layer center position that the
  // platform animates.
  double valueOffset;
};

std::optional<LayoutTargetMapping> targetForProperty(
    const std::string &property,
    const LayoutNativeConversionContext &context) {
  // Only targets the platform host realizes correctly route natively.
  // Objectives 10 and 11 extend this set.
  if (property == "opacity") {
    return LayoutTargetMapping{AnimationTargetKind::Opacity, 0};
  }
  if (property == "originX") {
    return LayoutTargetMapping{AnimationTargetKind::PositionX, context.finalWidth / 2};
  }
  if (property == "originY") {
    return LayoutTargetMapping{AnimationTargetKind::PositionY, context.finalHeight / 2};
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
  if (!supportsTiming(context.formSupport, *timingLeaf->easing) || context.formSupport.maxKeyframesPerTrack < 1) {
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
      AnimationValue{*property.initialValue + mapping->valueOffset},
      {{1.0, AnimationValue{timingLeaf->toValue + mapping->valueOffset}, *timingLeaf->easing}},
      delayMs,
      durationMs,
  };
  if (!accumulateTrackUsage(track, context.budget, usage)) {
    return TrackBuildFailure{TrackBuildFailureReason::ResourceLimit};
  }
  return buildAnimationTrack(std::move(track));
}

} // namespace

LayoutPlanBuildResult buildLayoutNativeAnimationPlan(
    const LayoutNativeAnimationBuildInput &input,
    const LayoutNativeConversionContext &context) {
  if (input.properties.empty() || input.hasUnanimatedInitialValues) {
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

LayoutPlanBuildResult LayoutNativeAnimationAdapter::buildPlan(
    std::vector<native_animation::TrackBuildResult> tracks) const {
  native_animation::AnimationPlan plan;
  plan.tracks.reserve(tracks.size());
  for (auto &result : tracks) {
    if (const auto *failure = std::get_if<native_animation::TrackBuildFailure>(&result)) {
      return *failure;
    }
    plan.tracks.push_back(std::move(std::get<native_animation::AnimationTrack>(result)));
  }
  return plan;
}

void LayoutNativeAnimationAdapter::schedule(
    const native_animation::AnimationHandle handle,
    const native_animation::AnimationAdmissionMode admissionMode,
    native_animation::AnimationPlan plan,
    native_animation::AnimationAdmissionCallback admission,
    native_animation::TerminalCallback terminal) const {
  service_->schedule(
      {handle, std::move(plan), admissionMode}, {callbackScheduler_, std::move(admission), std::move(terminal)});
}

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
