#pragma once

#import <reanimated/CSS/easing/EasingConfigs.h>
#import <reanimated/CSS/utils/platform.h>
#import <reanimated/NativeAnimations/NativeAnimationService.h>

#import <cstdint>
#import <memory>
#import <optional>
#import <string>

namespace reanimated::css {

struct BuiltCSSNativeTransition {
  native_animation::AnimationHandle handle;
  native_animation::AnimationPlan plan;
};

// FUTURE: this is a temporary adapter from the current CSS callback API to the
// shared service. It owns only translation and service calls, not CSS rules.
// Remove it when CSS builds and submits common tracks directly.
class CSSNativeTransitionAdapter {
 public:
  explicit CSSNativeTransitionAdapter(std::shared_ptr<native_animation::NativeAnimationService> service);

  std::optional<BuiltCSSNativeTransition> build(
      facebook::react::SurfaceId surfaceId,
      facebook::react::Tag tag,
      const std::string &propertyName,
      const PlatformValue &fromValue,
      const PlatformValue &toValue,
      const EasingConfig &easing,
      double delayMs,
      double durationMs,
      bool startFromCurrentValue);

  void schedule(
      BuiltCSSNativeTransition transition,
      native_animation::AnimationAdmissionCallback admission,
      native_animation::TerminalCallback terminal) const;
  void cancel(native_animation::AnimationHandle handle) const;
  void handoffAndRelease(native_animation::AnimationHandle handle, const std::string &propertyName);

 private:
  native_animation::AnimationHandle nextHandle(facebook::react::SurfaceId surfaceId, facebook::react::Tag tag);

  std::shared_ptr<native_animation::NativeAnimationService> service_;
  uint64_t nextGeneration_{0};
};

} // namespace reanimated::css
