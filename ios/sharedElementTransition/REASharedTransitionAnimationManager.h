#import <RNReanimated/REAAnimationsManager.h>

@interface REASharedTransitionAnimationManager : NSObject

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)onScreenTransitionCreate:(id)screen;
- (void)onNativeAnimationEnd:(UIView *)screeen;
- (void)onScreenRemoving:(UIView *)screen;
- (void)setAnimationsManager:(REAAnimationsManager *)animationsManager;

@end
