#pragma once

#import <reanimated/CSS/configs/CSSTransitionConfig.h>

#import <React/RCTSurfacePresenter.h>

#import <folly/dynamic.h>
#import <jsi/jsi.h>
#import <react/renderer/core/ReactPrimitives.h>

#import <Foundation/Foundation.h>

#import <string>

NS_ASSUME_NONNULL_BEGIN

@interface REACSSPlatformTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

/// Config path. Parses the jsi endpoints, animates the property natively
/// (reverse-shortening against any in-flight transition) and stores the settings
/// for later toggles. Returns NO when the value can't be expressed natively, so
/// the property falls back to the loop.
- (BOOL)applyTransitionForTag:(facebook::react::Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const facebook::jsi::Value &)fromValue
                      toValue:(const facebook::jsi::Value &)toValue
                      runtime:(facebook::jsi::Runtime &)runtime
                     settings:(const reanimated::css::CSSTransitionPropertySettings &)settings
                    timestamp:(double)timestamp;

/// Toggle path. The runtime-free folly counterpart; reuses the settings stored
/// by the config apply. Returns NO when the value can't be expressed natively or
/// the property was never config-applied (so no settings are known).
- (BOOL)applyDynamicTransitionForTag:(facebook::react::Tag)viewTag
                        propertyName:(const std::string &)propertyName
                           fromValue:(const folly::dynamic &)fromValue
                             toValue:(const folly::dynamic &)toValue
                           timestamp:(double)timestamp;

- (void)removeTransitionForTag:(facebook::react::Tag)viewTag propertyName:(const std::string &)propertyName;

@end

NS_ASSUME_NONNULL_END
