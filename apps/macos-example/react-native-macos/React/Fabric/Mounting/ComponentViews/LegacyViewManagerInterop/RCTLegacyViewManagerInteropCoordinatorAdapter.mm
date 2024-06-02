/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTLegacyViewManagerInteropCoordinatorAdapter.h"
#import <React/UIView+React.h>

@implementation RCTLegacyViewManagerInteropCoordinatorAdapter {
  RCTLegacyViewManagerInteropCoordinator *_coordinator;
  NSInteger _tag;
}

- (instancetype)initWithCoordinator:(RCTLegacyViewManagerInteropCoordinator *)coordinator reactTag:(NSInteger)tag
{
  if (self = [super init]) {
    _coordinator = coordinator;
    _tag = tag;
  }
  return self;
}

- (void)dealloc
{
  [_coordinator removeViewFromRegistryWithTag:_tag];
  [_paperView removeFromSuperview];
  [_coordinator removeObserveForTag:_tag];
}

- (RCTPlatformView *)paperView // [macOS]
{
  if (!_paperView) {
    _paperView = [_coordinator createPaperViewWithTag:_tag];
    __weak __typeof(self) weakSelf = self;
    [_coordinator addObserveForTag:_tag
                        usingBlock:^(std::string eventName, folly::dynamic event) {
                          if (weakSelf.eventInterceptor) {
                            weakSelf.eventInterceptor(eventName, event);
                          }
                        }];
    [_coordinator addViewToRegistry:_paperView withTag:_tag];
  }
  return _paperView;
}

- (void)setProps:(const folly::dynamic &)props
{
  [_coordinator setProps:props forView:self.paperView];
}

- (void)handleCommand:(NSString *)commandName args:(NSArray *)args
{
  [_coordinator handleCommand:commandName args:args reactTag:_tag paperView:self.paperView];
}

@end
