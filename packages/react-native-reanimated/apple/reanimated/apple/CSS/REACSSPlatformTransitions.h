#pragma once

#import <reanimated/CSS/easing/EasingConfigs.h>
#import <reanimated/CSS/utils/platform.h>

#import <React/RCTSurfacePresenter.h>

#import <react/renderer/core/ReactPrimitives.h>

#import <Foundation/Foundation.h>

#import <string>

NS_ASSUME_NONNULL_BEGIN

/// Core Animation backend for platform-routed CSS transitions. It only plays and cancels
/// what the shared routing engine hands it; the CSS reversing bookkeeping lives there.
@interface REACSSPlatformTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

/// Plays the property on the view's layer. `startTimestampMs` may lie in the past, which
/// CoreAnimation seeks to, or in the future, which it holds `fromValue` through.
/// `persistent` keeps the final value once the animation ends. Always succeeds: the layer
/// is resolved on the main thread, and a view that has none leaves nothing to animate.
- (BOOL)startTransitionForTag:(facebook::react::Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const reanimated::css::PlatformValue &)fromValue
                      toValue:(const reanimated::css::PlatformValue &)toValue
                   durationMs:(double)durationMs
             startTimestampMs:(double)startTimestampMs
                       easing:(const reanimated::css::EasingConfig &)easing
                   persistent:(BOOL)persistent;

/// Cancels the property's animation, leaving the last painted frame on screen.
- (void)stopTransitionForTag:(facebook::react::Tag)viewTag propertyName:(const std::string &)propertyName;

@end

NS_ASSUME_NONNULL_END
