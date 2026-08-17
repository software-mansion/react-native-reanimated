#include <reanimated/LayoutAnimations/LayoutNativeAnimationAdapter.h>

#include <utility>

namespace reanimated {

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
    native_animation::TerminalCallback terminal) const {
  // TODO: Supply an admission callback when layout selects between native playback and frame-driven fallback.
  service_->schedule({handle, std::move(plan), admissionMode}, {callbackScheduler_, {}, std::move(terminal)});
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

} // namespace reanimated
