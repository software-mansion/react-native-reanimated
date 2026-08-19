#pragma once

#import <reanimated/NativeAnimations/NativeAnimationInterfaces.h>
#import <reanimated/NativeAnimations/NativeAnimationService.h>

#import <React/RCTSurfacePresenter.h>

#import <memory>

namespace reanimated::native_animation {

std::shared_ptr<NativeAnimationService> makeAppleNativeAnimationService(RCTSurfacePresenter *surfacePresenter);

// One source for the track forms the Apple executor realizes. Routing reads it
// for construction and the executor enforces it during preparation.
NativeTrackFormSupport appleNativeTrackFormSupport();

} // namespace reanimated::native_animation
