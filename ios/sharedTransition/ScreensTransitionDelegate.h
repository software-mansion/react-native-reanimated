#import <RNReanimated/REAAnimationsManager.h>
#import <RNScreens/RNSScreen.h>
#import <RNScreens/RNSSharedElementAnimator.h>

@interface ScreensTransitionDelegate : NSObject <RNSSharedElementTransitionsDelegate>

@property REAAnimationsManager *animationsManager;

- (void)registerTransitioinTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)unregisterTransitioinTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;

@end
