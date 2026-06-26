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

/// Config path: animates the property natively and remembers its settings for
/// later toggles. Returns NO if the value can't be animated natively, in which
/// case it runs on the loop instead.
- (BOOL)applyTransitionForTag:(facebook::react::Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const facebook::jsi::Value &)fromValue
                      toValue:(const facebook::jsi::Value &)toValue
                      runtime:(facebook::jsi::Runtime &)runtime
                     settings:(const reanimated::css::CSSTransitionPropertySettings &)settings
                    timestamp:(double)timestamp;

/// Toggle path: a runtime-free version that reuses the settings stored by the
/// config apply. Returns NO if there are no stored settings or the value can't be
/// animated natively.
- (BOOL)applyDynamicTransitionForTag:(facebook::react::Tag)viewTag
                        propertyName:(const std::string &)propertyName
                           fromValue:(const folly::dynamic &)fromValue
                             toValue:(const folly::dynamic &)toValue
                           timestamp:(double)timestamp;

- (void)removeTransitionForTag:(facebook::react::Tag)viewTag propertyName:(const std::string &)propertyName;

@end

NS_ASSUME_NONNULL_END
