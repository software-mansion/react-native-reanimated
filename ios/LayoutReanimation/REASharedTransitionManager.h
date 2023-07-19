#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REASnapshot.h>

@interface REASharedTransitionManager : NSObject

- (void)notifyAboutNewView:(UIView *)view;
- (void)notifyAboutViewLayout:(UIView *)view withViewFrame:(CGRect)frame;
- (void)viewsDidLayout;
- (void)finishSharedAnimation:(UIView *)view removeView:(BOOL)removeView;
- (void)setFindPrecedingViewTagForTransitionBlock:
    (REAFindPrecedingViewTagForTransitionBlock)findPrecedingViewTagForTransition;
- (void)setCancelAnimationBlock:(REACancelAnimationBlock)cancelAnimationBlock;
- (instancetype)initWithAnimationsManager:(REAAnimationsManager *)animationManager;
- (UIView *)getTransitioningView:(NSNumber *)tag;
- (NSDictionary *)prepareDataForWorklet:(NSMutableDictionary *)currentValues
                           targetValues:(NSMutableDictionary *)targetValues;
- (void)onScreenRemoval:(UIView *)screen stack:(UIView *)stack;

@end
