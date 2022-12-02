#if __has_include(<RNScreens/RNSSharedElementAnimator.h>)

#import <RNReanimated/REASharedElementAnimatorDelegate.h>

@implementation REASharedElementAnimatorDelegate {
  REAAnimationsManager *_animationsManager;
}

- (instancetype)init
{
  self = [super init];
  return self;
}

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
}

- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
}

- (void)onScreenTransitionCreate:(id)screen
{
}

- (void)onNativeAnimationEnd:(UIView *)screen
{
  [_animationsManager restoreStateForSharedTransition];
}

- (void)setAnimationsManager:(REAAnimationsManager *)animationsManager
{
  _animationsManager = animationsManager;
}

- (void)onScreenRemoving:(UIView *)screen
{
}

- (NSArray<UIView *> *)getSharedElementsForCurrentTransition
{
  return nil;
}

@end

#endif
