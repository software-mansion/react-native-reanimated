#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REASnapshot.h>

@interface REASharedTransitionManager : NSObject

- (void)notifyAboutNewView:(RCTUIView *)view;
- (void)notifyAboutViewLayout:(RCTUIView *)view withViewFrame:(CGRect)frame;
- (void)viewsDidLayout;
- (void)finishSharedAnimation:(RCTUIView *)view removeView:(BOOL)removeView;
- (void)setFindPrecedingViewTagForTransitionBlock:
    (REAFindPrecedingViewTagForTransitionBlock)findPrecedingViewTagForTransition;
- (void)setCancelAnimationBlock:(REACancelAnimationBlock)cancelAnimationBlock;
- (instancetype)initWithAnimationsManager:(REAAnimationsManager *)animationManager;
- (RCTUIView *)getTransitioningView:(NSNumber *)tag;
- (NSDictionary *)prepareDataForWorklet:(NSMutableDictionary *)currentValues
                           targetValues:(NSMutableDictionary *)targetValues;
- (void)onScreenRemoval:(RCTUIView *)screen stack:(RCTUIView *)stack;

@end
