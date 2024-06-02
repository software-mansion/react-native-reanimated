/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import "RCTPlatformDisplayLink.h" // [macOS]

/**
 * Interface containing the information about the last screen refresh.
 */
@interface RCTFrameUpdate : NSObject

/**
 * Timestamp for the actual screen refresh
 */
@property (nonatomic, readonly) NSTimeInterval timestamp;

/**
 * Time since the last frame update ( >= 16.6ms )
 */
@property (nonatomic, readonly) NSTimeInterval deltaTime;

- (instancetype)initWithDisplayLink:(RCTPlatformDisplayLink *)displayLink NS_DESIGNATED_INITIALIZER; // [macOS]

@end

/**
 * Protocol that must be implemented for subscribing to display refreshes (DisplayLink updates)
 */
@protocol RCTFrameUpdateObserver <NSObject>

/**
 * Method called on every screen refresh (if paused != YES)
 */
- (void)didUpdateFrame:(RCTFrameUpdate *)update;

/**
 * Synthesize and set to true to pause the calls to -[didUpdateFrame:]
 */
@property (nonatomic, readonly, getter=isPaused) BOOL paused;

/**
 * Callback for pause/resume observer.
 * Observer should call it when paused property is changed.
 */
@property (nonatomic, copy) dispatch_block_t pauseCallback;

@end
