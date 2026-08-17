#pragma once

#include <reanimated/NativeAnimations/NativeAnimationService.h>

#include <memory>
#include <variant>
#include <vector>

namespace reanimated {

using LayoutPlanBuildResult = std::variant<native_animation::AnimationPlan, native_animation::TrackBuildFailure>;

// This adapter owns only layout-to-common conversion and requests. The layout
// manager keeps builder execution, whole-animation routing, callbacks, and exit
// cleanup.
class LayoutNativeAnimationAdapter {
 public:
  LayoutNativeAnimationAdapter(
      std::shared_ptr<native_animation::NativeAnimationService> service,
      native_animation::CallbackScheduler callbackScheduler);

  LayoutPlanBuildResult buildPlan(std::vector<native_animation::TrackBuildResult> tracks) const;
  void schedule(
      native_animation::AnimationHandle handle,
      native_animation::AnimationAdmissionMode admissionMode,
      native_animation::AnimationPlan plan,
      native_animation::TerminalCallback terminal) const;
  void claimFrameDriven(
      native_animation::ExternalClaimRequest request,
      native_animation::ExternalClaimCallbacks callbacks) const;
  void releaseFrameDriven(native_animation::AnimationHandle handle, native_animation::AnimationOutcome outcome) const;

 private:
  std::shared_ptr<native_animation::NativeAnimationService> service_;
  native_animation::CallbackScheduler callbackScheduler_;
};

} // namespace reanimated
