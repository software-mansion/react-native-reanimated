#pragma once

#import <reanimated/CSS/easing/EasingConfigs.h>
#import <reanimated/CSS/utils/platform.h>
#import <reanimated/NativeAnimations/NativeAnimationTiming.h>

#import <optional>

namespace reanimated::css {

// FUTURE: This is a temporary timing conversion for the CSS compatibility adapter.
// Remove it when the CSS semantic layer builds common timing data directly.
struct CSSNativeTransitionTiming {
  PlatformValue startValue;
  double delayMs;
  double durationMs;
  native_animation::AnimationTiming timing;
};

std::optional<CSSNativeTransitionTiming> resolveCSSNativeTransitionTiming(
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const EasingConfig &easing,
    double delayMs,
    double durationMs);

} // namespace reanimated::css
