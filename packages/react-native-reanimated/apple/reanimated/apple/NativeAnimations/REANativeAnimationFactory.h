#pragma once

#import <QuartzCore/QuartzCore.h>

#import <reanimated/NativeAnimations/NativeAnimationIR.h>
#import <reanimated/apple/NativeAnimations/REANativeAnimationTrack.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Converts one platform-neutral timing track into a Core Animation primitive.
 *
 * A canonical single timing segment becomes `CABasicAnimation`. Structured
 * timing, holds, and explicit keyframes become `CAKeyframeAnimation` without
 * resampling their declared times or timing functions.
 */
@interface REANativeAnimationFactory : NSObject

+ (nullable REANativeAnimationTrack *)animationForTrack:(const reanimated::NativeAnimationTrack &)track
                                         planDurationMs:(double)planDurationMs
                                                  layer:(CALayer *)layer
                                         localBeginTime:(CFTimeInterval)localBeginTime;

@end

NS_ASSUME_NONNULL_END
