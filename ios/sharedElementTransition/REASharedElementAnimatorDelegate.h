#if __has_include(<RNScreens/RNSSharedElementAnimator.h>)

#import <RNReanimated/REAAnimationsManager.h>
#import <RNScreens/RNSSharedElementAnimator.h>

@interface REASharedElementAnimatorDelegate : NSObject <RNSSharedElementAnimatorDelegate>

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)setAnimationsManager:(REAAnimationsManager *)animationsManager;

@end

#endif
