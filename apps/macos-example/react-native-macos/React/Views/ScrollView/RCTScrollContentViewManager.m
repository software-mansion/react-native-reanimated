/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTScrollContentViewManager.h"

#import "RCTScrollContentShadowView.h"
#import "RCTScrollContentView.h"

@implementation RCTScrollContentViewManager

RCT_EXPORT_MODULE()

RCT_EXPORT_OSX_VIEW_PROPERTY(inverted, BOOL) // [macOS]

- (RCTScrollContentView *)view
{
  return [RCTScrollContentView new];
}

- (RCTShadowView *)shadowView
{
  return [RCTScrollContentShadowView new];
}

@end
