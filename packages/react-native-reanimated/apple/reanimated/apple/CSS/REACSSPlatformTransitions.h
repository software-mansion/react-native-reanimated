#pragma once

#import <reanimated/CSS/easing/EasingConfigs.h>
#import <reanimated/CSS/utils/platform.h>

#import <React/RCTSurfacePresenter.h>

#import <react/renderer/core/ReactPrimitives.h>

#import <Foundation/Foundation.h>

#import <string>

NS_ASSUME_NONNULL_BEGIN

@interface REACSSPlatformTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

/// Animates the property natively from `fromValue` to `toValue` over the given
/// window. Parsing, routing, and reverse-shortening already happened in common;
/// this only drives Core Animation.
- (void)animateForTag:(facebook::react::Tag)viewTag
         propertyName:(const std::string &)propertyName
            fromValue:(const reanimated::css::PlatformValue &)fromValue
              toValue:(const reanimated::css::PlatformValue &)toValue
           durationMs:(double)durationMs
          startTimeMs:(double)startTimeMs
               easing:(const reanimated::css::EasingConfig &)easing;

- (void)removeTransitionForTag:(facebook::react::Tag)viewTag propertyName:(const std::string &)propertyName;

@end

NS_ASSUME_NONNULL_END
