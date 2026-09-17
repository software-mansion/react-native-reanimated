#pragma once

#import <reanimated/CSS/easing/EasingConfigs.h>
#import <reanimated/CSS/utils/platform.h>

#import <React/RCTSurfacePresenter.h>

#import <react/renderer/core/ReactPrimitives.h>

#import <Foundation/Foundation.h>

#import <string>

NS_ASSUME_NONNULL_BEGIN

/// Core Animation backend for CSS transitions.
@interface REACSSPlatformTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

- (BOOL)startTransitionForTag:(facebook::react::Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const reanimated::css::PlatformValue &)fromValue
                      toValue:(const reanimated::css::PlatformValue &)toValue
                   durationMs:(double)durationMs
             startTimestampMs:(double)startTimestampMs
                       easing:(const reanimated::css::EasingConfig &)easing
                   persistent:(BOOL)persistent;

/// `settle` shows the committed model value; a hand-off to the loop and a held
/// (persistent) value keep the last presented frame in the model instead.
- (void)stopTransitionForTag:(facebook::react::Tag)viewTag
                propertyName:(const std::string &)propertyName
                      settle:(BOOL)settle;

@end

NS_ASSUME_NONNULL_END
