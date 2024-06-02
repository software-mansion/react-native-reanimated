/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTInvalidating.h>
#import <React/RCTURLRequestHandler.h>

/**
 * This is the default RCTURLRequestHandler implementation for file requests.
 */
@interface RCTFileRequestHandler : NSObject <RCTURLRequestHandler, RCTInvalidating>

@end
