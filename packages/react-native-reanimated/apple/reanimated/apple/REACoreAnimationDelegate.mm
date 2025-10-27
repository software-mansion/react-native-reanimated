#import "REACoreAnimationDelegate.h"

@interface REACoreAnimationDelegate ()
@property (nonatomic, copy, nullable) AnimationStartBlock startBlock;
@property (nonatomic, copy, nullable) AnimationStopBlock stopBlock;
@end

@implementation REACoreAnimationDelegate

+ (instancetype)delegateWithStart:(AnimationStartBlock)start stop:(AnimationStopBlock)stop
{
  REACoreAnimationDelegate *d = [REACoreAnimationDelegate new];
  d.startBlock = start;
  d.stopBlock = stop;
  return d;
}

#pragma mark - CAAnimationDelegate

- (void)animationDidStart:(CAAnimation *)anim
{
  if (self.startBlock)
    self.startBlock(anim);
}

- (void)animationDidStop:(CAAnimation *)anim finished:(BOOL)flag
{
  if (self.stopBlock)
    self.stopBlock(anim, flag);
}

@end
