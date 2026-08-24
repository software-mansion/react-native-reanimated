#pragma once

#import <reanimated/CSS/configs/CSSTransitionConfig.h>
#import <reanimated/CSS/utils/platform.h>

#import <React/RCTSurfacePresenter.h>

#import <react/renderer/core/ReactPrimitives.h>

#import <Foundation/Foundation.h>

#import <optional>
#import <string>

NS_ASSUME_NONNULL_BEGIN

@interface REACSSPlatformTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

/// Animates the property natively and remembers its settings for later toggles.
/// A null `settings` marks the toggle path, where the stored settings are reused;
/// returns NO when there are none. `persistent` holds the value past the animation.
- (BOOL)applyTransitionForTag:(facebook::react::Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const reanimated::css::PlatformValue &)fromValue
                      toValue:(const reanimated::css::PlatformValue &)toValue
                     settings:(nullable const reanimated::css::CSSTransitionPropertySettings *)settings
                   persistent:(BOOL)persistent
                    timestamp:(double)timestamp;

- (void)removeTransitionForTag:(facebook::react::Tag)viewTag propertyName:(const std::string &)propertyName;

/// Retraced from the stored timeline: the presentation layer has this value, but only
/// the main thread may read it. nullopt after a non-reversing interruption.
- (std::optional<reanimated::css::PlatformValue>)getCurrentValueForTag:(facebook::react::Tag)viewTag
                                                          propertyName:(const std::string &)propertyName
                                                             timestamp:(double)timestamp;

@end

NS_ASSUME_NONNULL_END
