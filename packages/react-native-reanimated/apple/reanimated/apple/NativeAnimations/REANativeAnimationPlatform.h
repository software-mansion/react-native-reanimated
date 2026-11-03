#pragma once

#import <reanimated/NativeAnimations/NativeAnimationPlatform.h>

#import <React/RCTSurfacePresenter.h>

#import <memory>

namespace reanimated::native_animation {

/// Whether Core Animation can play the track. A domain uses it to route before it starts a command.
bool canPlayWithCoreAnimation(const AnimationTrack &track);

std::shared_ptr<NativeAnimationPlatform> makeCoreAnimationPlatform(RCTSurfacePresenter *surfacePresenter);

} // namespace reanimated::native_animation
