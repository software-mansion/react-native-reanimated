/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTAnimatedNode.h"

#import <React/RCTSurfacePresenterStub.h>

@class RCTBridge;
@class RCTViewPropertyMapper;

@interface RCTPropsAnimatedNode : RCTAnimatedNode

- (void)connectToView:(NSNumber *)viewTag
             viewName:(NSString *)viewName
               bridge:(RCTBridge *)bridge
     surfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter;

- (void)disconnectFromView:(NSNumber *)viewTag;

- (void)restoreDefaultValues;

@end
