/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTDefines.h>
#import <React/RCTJavaScriptExecutor.h>

#if RCT_DEV // Debug executors are only supported in dev mode

@interface RCTWebSocketExecutor : NSObject <RCTJavaScriptExecutor>

- (instancetype)initWithURL:(NSURL *)URL;

@end

#endif
