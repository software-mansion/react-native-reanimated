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

/// The value the native animation shows at `timestamp`, reconstructed from the
/// stored timeline. The presentation layer holds the same value, but only the main
/// thread may read it, and routing needs the answer inline. nullopt once a
/// mid-flight interruption has dropped the start value.
- (std::optional<reanimated::css::PlatformValue>)currentValueForTag:(facebook::react::Tag)viewTag
                                                       propertyName:(const std::string &)propertyName
                                                          timestamp:(double)timestamp;

@end

NS_ASSUME_NONNULL_END
