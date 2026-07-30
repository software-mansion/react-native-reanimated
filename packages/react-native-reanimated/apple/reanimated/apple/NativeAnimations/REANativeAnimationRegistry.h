#pragma once

#import <QuartzCore/QuartzCore.h>

#import <reanimated/NativeAnimations/NativeAnimationTypes.h>
#import <reanimated/apple/NativeAnimations/REANativeAnimationTrack.h>

#import <functional>

NS_ASSUME_NONNULL_BEGIN

/**
 * Owns Core Animation keys and target claims for direct native animations.
 *
 * All methods require the main thread. A replacement captures presentation
 * values, moves unaffected physical tracks to the replacement handle, and
 * terminates the replaced logical handle exactly once.
 */
@interface REANativeAnimationRegistry : NSObject

- (BOOL)installTracks:(NSArray<REANativeAnimationTrack *> *)tracks
               handle:(reanimated::NativeAnimationHandle)handle
                layer:(CALayer *)layer
              onStart:(std::function<void(void)>)onStart
           onTerminal:(std::function<void(bool)>)onTerminal;

- (void)cancelHandle:(reanimated::NativeAnimationHandle)handle
         disposition:(reanimated::NativeAnimationCancelDisposition)disposition;

- (void)cancelSurface:(facebook::react::SurfaceId)surfaceId;

@end

NS_ASSUME_NONNULL_END
