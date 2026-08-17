#pragma once

#import <reanimated/CSS/configs/CSSTransitionConfig.h>
#import <reanimated/CSS/utils/platform.h>
#import <reanimated/NativeAnimations/NativeAnimationService.h>

#import <React/RCTSurfacePresenter.h>

#import <react/renderer/core/ReactPrimitives.h>

#import <Foundation/Foundation.h>

#import <string>

NS_ASSUME_NONNULL_BEGIN

// Temporary CSS host for the shared native-animation service.
// Remove it when CSS submits common tracks from its semantic layer.
@interface REACSSSharedNativeTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
                  nativeAnimationService:(std::shared_ptr<reanimated::native_animation::NativeAnimationService>)service;

/// Animates the property natively and remembers its settings for later toggles.
/// A null `settings` marks the toggle path, where the stored settings are reused.
/// `persistent` holds the value past the animation. Returns NO when a toggle has
/// no stored settings to reuse.
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
