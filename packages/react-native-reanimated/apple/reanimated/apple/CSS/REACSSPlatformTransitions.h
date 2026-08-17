#pragma once

#import <reanimated/CSS/configs/CSSTransitionConfig.h>
#import <reanimated/CSS/utils/platform.h>

#import <React/RCTSurfacePresenter.h>

#import <react/renderer/core/ReactPrimitives.h>

#import <Foundation/Foundation.h>

#import <string>

NS_ASSUME_NONNULL_BEGIN

// The direct CSS Core Animation host. This remains the default while the
// shared native-animation service is behind its layout animation feature flag.
@interface REACSSPlatformTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

/// Animates the property natively and remembers its settings for later toggles.
/// A null `settings` marks the toggle path, where the stored settings are reused;
/// returns NO when there are none. `persistent` holds the value past the animation.
- (BOOL)applyTransitionForTag:(facebook::react::Tag)viewTag
                    surfaceId:(facebook::react::SurfaceId)surfaceId
                 propertyName:(const std::string &)propertyName
                    fromValue:(const reanimated::css::PlatformValue &)fromValue
                      toValue:(const reanimated::css::PlatformValue &)toValue
                     settings:(nullable const reanimated::css::CSSTransitionPropertySettings *)settings
                   persistent:(BOOL)persistent
                    timestamp:(double)timestamp;

- (void)removeTransitionForTag:(facebook::react::Tag)viewTag
                     surfaceId:(facebook::react::SurfaceId)surfaceId
                  propertyName:(const std::string &)propertyName;

@end

NS_ASSUME_NONNULL_END
