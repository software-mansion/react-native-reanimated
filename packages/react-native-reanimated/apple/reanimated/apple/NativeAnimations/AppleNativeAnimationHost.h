#pragma once

#import <reanimated/NativeAnimations/NativeAnimationService.h>

#import <React/RCTSurfacePresenter.h>

#import <memory>

namespace reanimated::native_animation {

std::shared_ptr<NativeAnimationService> makeAppleNativeAnimationService(RCTSurfacePresenter *surfacePresenter);

} // namespace reanimated::native_animation
