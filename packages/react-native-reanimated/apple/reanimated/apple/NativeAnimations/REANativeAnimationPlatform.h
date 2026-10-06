#pragma once

#import <reanimated/NativeAnimations/NativeAnimationPlatform.h>

#import <React/RCTSurfacePresenter.h>

#import <memory>

namespace reanimated::native_animation {

std::shared_ptr<NativeAnimationPlatform> makeCoreAnimationPlatform(RCTSurfacePresenter *surfacePresenter);

} // namespace reanimated::native_animation
