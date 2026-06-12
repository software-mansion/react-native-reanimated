#pragma once

#import <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#import <React/RCTSurfacePresenter.h>

#import <Foundation/Foundation.h>

#import <string>

NS_ASSUME_NONNULL_BEGIN

@interface REACSSPlatformTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

- (void)applyTransition:(const reanimated::css::CSSPlatformTransitionPropertyConfig &)config;
- (void)removeTransitionForTag:(facebook::react::Tag)viewTag propertyName:(const std::string &)propertyName;

@end

NS_ASSUME_NONNULL_END
