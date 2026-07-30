#pragma once

#import <React/RCTSurfacePresenter.h>
#import <reanimated/NativeAnimations/NativeAnimationPlan.h>
#import <reanimated/NativeAnimations/NativeAnimationTypes.h>

#import <functional>

NS_ASSUME_NONNULL_BEGIN

/**
 * Orders native layout-animation starts after the matching Fabric surface
 * mount. Final-state plans start only when the mounted layer model matches the
 * plan's final geometry. Retained exit plans require only a mounted view
 * on the matching surface.
 */
@interface REANativeLayoutAnimationPostMountQueue : NSObject <RCTSurfacePresenterObserver>

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

- (void)enqueueHandle:(reanimated::NativeAnimationHandle)handle
                 plan:(const reanimated::NativeAnimationPlan &)plan
         mountingMode:(reanimated::NativeAnimationMountingMode)mountingMode
                start:(std::function<void()>)start
               reject:(std::function<void()>)reject;

- (void)cancelHandle:(reanimated::NativeAnimationHandle)handle;

@end

NS_ASSUME_NONNULL_END
