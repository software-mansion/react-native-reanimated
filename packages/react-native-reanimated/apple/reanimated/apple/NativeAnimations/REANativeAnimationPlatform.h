#pragma once

#import <reanimated/NativeAnimations/NativeAnimationPlatform.h>

#import <React/RCTSurfacePresenter.h>

#import <array>
#import <memory>

namespace reanimated::native_animation {

/// CAMediaTimingFunction carries only linear and cubic-bezier curves.
inline constexpr std::array kCoreAnimationTimingKinds{AnimationTimingKind::Linear, AnimationTimingKind::CubicBezier};

std::shared_ptr<NativeAnimationPlatform> makeCoreAnimationPlatform(RCTSurfacePresenter *surfacePresenter);

} // namespace reanimated::native_animation
