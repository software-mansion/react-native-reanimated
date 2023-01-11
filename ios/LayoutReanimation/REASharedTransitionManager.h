#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REASnapshot.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASharedTransitionManager : NSObject

- (void)notifyAboutNewView:(UIView *)view;
- (void)viewsDidLayout;
- (BOOL)setupSyncSharedTransitionForViews:(NSArray<UIView *> *)views;
- (void)finishSharedAnimation:(UIView *)view;
- (NSArray<UIView *> *)getCurrentSharedTransitionViews;
- (void)setFindTheOtherForSharedTransitionBlock:
    (REAFindTheOtherForSharedTransitionBlock)findTheOtherForSharedTransition;
- (instancetype)initWithAnimationsManager:(REAAnimationsManager *)animationManager;
- (void)tmp:(NSNumber *)viewTag;

@end

NS_ASSUME_NONNULL_END
