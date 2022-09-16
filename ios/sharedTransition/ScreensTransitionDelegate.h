#import <RNReanimated/REAAnimationsManager.h>
#import <RNScreens/RNSScreen.h>
#import <RNScreens/RNSSharedElementAnimator.h>

@interface ScreensTransitionDelegate : NSObject <RNSSharedElementTransitionsDelegate>

@property REAAnimationsManager *animationsManager;

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;

@end
