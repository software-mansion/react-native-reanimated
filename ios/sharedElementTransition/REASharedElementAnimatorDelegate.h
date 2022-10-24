#import <RNReanimated/REAAnimationsManager.h>
//#if __has_include(<RNScreens/RNSScreen.h>)
//#endif
#import <RNScreens/RNSSharedElementAnimator.h>

@interface REASharedElementAnimatorDelegate : NSObject <RNSSharedElementAnimatorDelegate>

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)setAnimationsManager:(REAAnimationsManager *)animationsManager;

@end
