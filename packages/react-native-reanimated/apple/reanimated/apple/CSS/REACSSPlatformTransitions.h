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

/// Supports past or future start times and optionally holds the final value.
- (BOOL)startTransitionForTag:(facebook::react::Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const reanimated::css::PlatformValue &)fromValue
                      toValue:(const reanimated::css::PlatformValue &)toValue
                   durationMs:(double)durationMs
             startTimestampMs:(double)startTimestampMs
                       easing:(const reanimated::css::EasingConfig &)easing
                   persistent:(BOOL)persistent;

- (void)stopTransitionForTag:(facebook::react::Tag)viewTag propertyName:(const std::string &)propertyName;

@end

NS_ASSUME_NONNULL_END
