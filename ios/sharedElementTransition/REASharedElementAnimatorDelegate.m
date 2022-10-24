#import <RNReanimated/REASharedElementAnimatorDelegate.h>
#import <RNReanimated/REASharedTransitionAnimationManager.h>
#import <RNReanimated/REASharedTransitionConfig.h>
#import <RNReanimated/REASharedViewConfig.h>
#import <RNScreens/RNSScreen.h>

@implementation REASharedElementAnimatorDelegate {
  REASharedTransitionAnimationManager *_sharedTransitionAnimationManager;
}

- (instancetype)init
{
  self = [super init];
  _sharedTransitionAnimationManager = [[REASharedTransitionAnimationManager alloc] init];
  return self;
}

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  [_sharedTransitionAnimationManager registerTransitionTag:transitionTag viewTag:viewTag];
}

- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  [_sharedTransitionAnimationManager unregisterTransitionTag:transitionTag viewTag:viewTag];
}

- (void)onScreenTransitionCreate:(id)screen
{
  [_sharedTransitionAnimationManager onScreenTransitionCreate:screen];
}

- (void)onNativeAnimationEnd:(UIView *)screen
{
  [_sharedTransitionAnimationManager onNativeAnimationEnd:screen];
}

- (void)setAnimationsManager:(REAAnimationsManager *)animationsManager
{
  [_sharedTransitionAnimationManager setAnimationsManager:animationsManager];
}

@end
