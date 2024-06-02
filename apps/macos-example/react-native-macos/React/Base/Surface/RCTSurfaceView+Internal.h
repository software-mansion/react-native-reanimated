/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h>

#import <React/RCTSurfaceStage.h>
#import <React/RCTSurfaceView.h>

@class RCTSurfaceRootView;

NS_ASSUME_NONNULL_BEGIN

@interface RCTSurfaceView (Internal)

@property (nonatomic, nullable, strong) RCTSurfaceRootView *rootView;
@property (nonatomic, assign) RCTSurfaceStage stage;

@end

NS_ASSUME_NONNULL_END
