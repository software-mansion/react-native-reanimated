#pragma once

#import <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#import <React/RCTSurfacePresenter.h>

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface REACSSPlatformTransitions : NSObject

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

- (void)applyTransition:(const reanimated::css::CSSPlatformTransitionPropertyConfig &)config;
- (void)removeTransitionForTag:(facebook::react::Tag)viewTag propertyName:(NSString *)propertyName;

@end

bool canRouteCSSProperty(const std::string &propertyName, const reanimated::css::EasingConfig &easing);

NS_ASSUME_NONNULL_END
