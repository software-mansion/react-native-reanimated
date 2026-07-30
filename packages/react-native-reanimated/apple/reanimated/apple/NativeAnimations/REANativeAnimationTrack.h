#pragma once

#import <QuartzCore/QuartzCore.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * One resolved physical Core Animation track with both its key-path identity
 * and its canonical ownership target.
 */
@interface REANativeAnimationTrack : NSObject

@property (nonatomic, readonly) CAAnimation *animation;
@property (nonatomic, readonly) NSString *keyPath;
@property (nonatomic, readonly) NSString *targetName;
@property (nonatomic, readonly) NSString *ownershipTargetName;

- (instancetype)initWithAnimation:(CAAnimation *)animation
                          keyPath:(NSString *)keyPath
                       targetName:(NSString *)targetName
              ownershipTargetName:(NSString *)ownershipTargetName;

@end

NS_ASSUME_NONNULL_END
