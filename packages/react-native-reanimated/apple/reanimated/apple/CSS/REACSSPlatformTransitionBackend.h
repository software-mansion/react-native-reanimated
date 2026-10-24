#pragma once

#import <reanimated/CSS/core/transition/CSSPlatformTransitionBackend.h>
#import <reanimated/NativeAnimations/NativeAnimationHost.h>

#import <memory>

namespace reanimated::css {

/// Plays CSS transitions through the shared native animation host.
std::shared_ptr<CSSPlatformTransitionBackend> makeCSSPlatformTransitionBackend(
    const std::shared_ptr<native_animation::NativeAnimationHost> &host);

} // namespace reanimated::css
