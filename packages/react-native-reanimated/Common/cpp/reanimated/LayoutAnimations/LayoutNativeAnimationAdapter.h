#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <reanimated/NativeAnimations/NativeAnimationService.h>
#include <reanimated/NativeAnimations/NativeAnimationValidation.h>

#include <memory>
#include <optional>
#include <string>
#include <variant>
#include <vector>

namespace reanimated {

using LayoutPlanBuildResult = std::variant<native_animation::AnimationPlan, native_animation::TrackBuildFailure>;

// Whole-animation routes. The numeric values label route trace events.
enum class LayoutNativeAnimationRoute : uint8_t {
  DirectBasic,
  StructuredFinite,
  SampledDeterministic,
  FrameDriven,
};

// One leaf of the stable structure that animation factories attach. An empty
// `easing` means the curve has no common timing data.
struct LayoutNativeTimingLeaf {
  double toValue{0};
  double durationMs{0};
  std::optional<native_animation::AnimationTiming> easing;
};

// Structure the factories could not describe; the property has no native form.
struct LayoutNativeUnsupportedLeaf {};

using LayoutNativeAnimationLeaf = std::variant<LayoutNativeTimingLeaf, LayoutNativeUnsupportedLeaf>;

struct LayoutNativeAnimatedProperty {
  std::string property;
  std::optional<double> initialValue;
  // Sum of the delay wrappers around the leaf.
  double delayMs{0};
  LayoutNativeAnimationLeaf leaf{LayoutNativeUnsupportedLeaf{}};
};

// Owned build input read once from the builder result. It contains no JSI or
// platform data, so track construction stays pure and testable.
struct LayoutNativeAnimationBuildInput {
  std::vector<LayoutNativeAnimatedProperty> properties;
  // Initial-value keys without an animation. The frame-driven writer writes
  // them too; the common plan cannot express them, so the whole animation
  // stays frame-driven when any exist.
  std::vector<std::string> initialOnlyKeys;
};

// Mounted final geometry and platform facts for conversion. The final size
// converts frame origins to layer centers; it stays constant while size
// tracks are unsupported.
struct LayoutNativeConversionContext {
  double finalWidth{0};
  double finalHeight{0};
  // Mounted final values in the same units as the builder values. A plan
  // endpoint that differs from them routes frame-driven.
  double finalOriginX{0};
  double finalOriginY{0};
  double finalOpacity{1};
  native_animation::NativeTrackFormSupport formSupport;
  native_animation::NativeAnimationResourceBudget budget{native_animation::kDefaultResourceBudget};
};

// The targets a frame-driven writer of this build writes, for its external
// lease. A key without a known target claims every visual target; Legacy
// entering always claims opacity.
std::vector<native_animation::AnimationTargetClaim> frameDrivenClaimTargets(
    const LayoutNativeAnimationBuildInput &input,
    LayoutAnimationType type);

// Converts every property once and returns one owned plan or the first typed
// failure. It never starts fallback.
LayoutPlanBuildResult buildLayoutNativeAnimationPlan(
    const LayoutNativeAnimationBuildInput &input,
    const LayoutNativeConversionContext &context);

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
      native_animation::AnimationAdmissionCallback admission,
      native_animation::TerminalCallback terminal) const;
  void claimFrameDriven(
      native_animation::ExternalClaimRequest request,
      native_animation::ExternalClaimCallbacks callbacks) const;
  void releaseFrameDriven(native_animation::AnimationHandle handle, native_animation::AnimationOutcome outcome) const;
  void cancel(native_animation::AnimationHandle handle) const;

 private:
  std::shared_ptr<native_animation::NativeAnimationService> service_;
  native_animation::CallbackScheduler callbackScheduler_;
};

} // namespace reanimated
