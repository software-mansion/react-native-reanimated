#import <RNReanimated/REAAnimationsManager.h>
//#if __has_include(<RNScreens/RNSScreen.h>) // TODO
//#endif
#import <RNScreens/RNSScreen.h>
#import <RNScreens/RNSSharedElementAnimator.h>

@interface SharedViewConfig : NSObject

- (void)setView:(UIView *)view;
- (UIView *)getView;

@property NSNumber *viewTag;
@property BOOL toRemove;

@end

@interface SharedElementConfig : NSObject

@property UIView *fromView;
@property UIView *toView;
@property UIView *fromContainer;
@property int fromViewIndex;
@property CGRect fromViewFrame;

- (instancetype)initWithFromView:(UIView *)fromView
                          toView:(UIView *)toView
                   fromContainer:(UIView *)fromContainer
                   fromViewFrame:(CGRect)fromViewFrame;

@end

@interface ScreensTransitionDelegate : NSObject <RNSSharedElementTransitionsDelegate>

@property REAAnimationsManager *animationsManager;

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;
- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag;

@end
