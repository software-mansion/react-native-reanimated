#pragma once

#import <React/RCTSurfacePresenter.h>
#import <reanimated/NativeModules/ReanimatedModuleProxy.h>

#import <memory>

NS_ASSUME_NONNULL_BEGIN

@interface REASynchronousPropsRewriter : NSObject <RCTSurfacePresenterObserver>

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
                   reanimatedModuleProxy:
                       (const std::shared_ptr<reanimated::ReanimatedModuleProxy> &)reanimatedModuleProxy;

@end

NS_ASSUME_NONNULL_END
