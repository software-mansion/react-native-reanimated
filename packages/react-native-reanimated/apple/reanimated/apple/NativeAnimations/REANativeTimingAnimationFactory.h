#pragma once

#import <QuartzCore/QuartzCore.h>

#import <reanimated/NativeAnimations/NativeAnimationIR.h>

NS_ASSUME_NONNULL_BEGIN

@interface REANativeTimingTrackAnimation : NSObject

@property (nonatomic, readonly) CAAnimation *animation;
@property (nonatomic, readonly) NSString *keyPath;
@property (nonatomic, readonly) NSString *targetName;

- (instancetype)initWithAnimation:(CAAnimation *)animation
                          keyPath:(NSString *)keyPath
                       targetName:(NSString *)targetName;

@end

/**
 * Converts one platform-neutral timing track into a Core Animation primitive.
 *
 * A canonical single timing segment becomes `CABasicAnimation`. Structured
 * timing, holds, and explicit keyframes become `CAKeyframeAnimation` without
 * resampling their declared times or timing functions.
 */
@interface REANativeTimingAnimationFactory : NSObject

+ (nullable REANativeTimingTrackAnimation *)animationForTrack:(const reanimated::NativeAnimationTrack &)track
                                               planDurationMs:(double)planDurationMs
                                                        layer:(CALayer *)layer
                                               localBeginTime:(CFTimeInterval)localBeginTime;

@end

NS_ASSUME_NONNULL_END
