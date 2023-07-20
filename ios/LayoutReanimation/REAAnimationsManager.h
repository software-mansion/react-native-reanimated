#import <Foundation/Foundation.h>
#import <RNReanimated/LayoutAnimationType.h>
#import <RNReanimated/REANodesManager.h>
#import <RNReanimated/REASnapshot.h>
#import <React/RCTUIManager.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, ViewState) {
  Inactive,
  Appearing,
  Disappearing,
  Layout,
  ToRemove,
};

typedef BOOL (^REAHasAnimationBlock)(NSNumber *_Nonnull tag, LayoutAnimationType type);
typedef void (
    ^REAAnimationStartingBlock)(NSNumber *_Nonnull tag, LayoutAnimationType type, NSDictionary *_Nonnull yogaValues);
typedef void (^REAAnimationRemovingBlock)(NSNumber *_Nonnull tag);
#ifdef DEBUG
typedef void (^REACheckDuplicateSharedTagBlock)(UIView *view, NSNumber *_Nonnull viewTag);
#endif
typedef void (^REACancelAnimationBlock)(NSNumber *_Nonnull tag);
typedef NSNumber *_Nullable (^REAFindPrecedingViewTagForTransitionBlock)(NSNumber *_Nonnull tag);
typedef int (^REATreeVisitor)(id<RCTComponent>);
BOOL REANodeFind(id<RCTComponent> view, int (^block)(id<RCTComponent>));

@interface REAAnimationsManager : NSObject

- (instancetype)initWithUIManager:(RCTUIManager *)uiManager;
- (void)setAnimationStartingBlock:(REAAnimationStartingBlock)startAnimation;
- (void)setHasAnimationBlock:(REAHasAnimationBlock)hasAnimation;
- (void)setAnimationRemovingBlock:(REAAnimationRemovingBlock)clearAnimation;
#ifdef DEBUG
- (void)setCheckDuplicateSharedTagBlock:(REACheckDuplicateSharedTagBlock)checkDuplicateSharedTag;
#endif
- (void)progressLayoutAnimationWithStyle:(NSDictionary *_Nonnull)newStyle
                                  forTag:(NSNumber *_Nonnull)tag
                      isSharedTransition:(BOOL)isSharedTransition;
- (void)setFindPrecedingViewTagForTransitionBlock:
    (REAFindPrecedingViewTagForTransitionBlock)findPrecedingViewTagForTransition;
- (void)setCancelAnimationBlock:(REACancelAnimationBlock)animationCancellingBlock;
- (void)endLayoutAnimationForTag:(NSNumber *_Nonnull)tag removeView:(BOOL)removeView;
- (void)endAnimationsRecursive:(UIView *)view;
- (void)invalidate;
- (void)viewDidMount:(UIView *)view withBeforeSnapshot:(REASnapshot *)snapshot withNewFrame:(CGRect)frame;
- (REASnapshot *)prepareSnapshotBeforeMountForView:(UIView *)view;
- (BOOL)wantsHandleRemovalOfView:(UIView *)view;
- (void)removeAnimationsFromSubtree:(UIView *)view;
- (void)reattachAnimatedChildren:(NSArray<id<RCTComponent>> *)children
                     toContainer:(id<RCTComponent>)container
                       atIndices:(NSArray<NSNumber *> *)indices;
- (void)onViewCreate:(UIView *)view after:(REASnapshot *)after;
- (void)onViewUpdate:(UIView *)view before:(REASnapshot *)before after:(REASnapshot *)after;
- (void)viewsDidLayout;
- (NSMutableDictionary *)prepareDataForLayoutAnimatingWorklet:(NSMutableDictionary *)currentValues
                                                 targetValues:(NSMutableDictionary *)targetValues;
- (UIView *)viewForTag:(NSNumber *)tag;
- (BOOL)hasAnimationForTag:(NSNumber *)tag type:(LayoutAnimationType)type;
- (void)clearAnimationConfigForTag:(NSNumber *)tag;
- (void)startAnimationForTag:(NSNumber *)tag type:(LayoutAnimationType)type yogaValues:(NSDictionary *)yogaValues;
- (void)onScreenRemoval:(UIView *)screen stack:(UIView *)stack;

@end

NS_ASSUME_NONNULL_END
