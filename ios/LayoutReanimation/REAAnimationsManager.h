#import <Foundation/Foundation.h>
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

typedef BOOL (^REAHasAnimationBlock)(NSNumber *_Nonnull tag, NSString *_Nonnull type);
typedef void (^REAAnimationStartingBlock)(NSNumber *_Nonnull tag, NSString *_Nonnull type, NSDictionary *_Nonnull yogaValues, NSNumber *_Nonnull depth);
typedef void (^REAAnimationRemovingBlock)(NSNumber *_Nonnull tag);

@interface REAAnimationsManager : NSObject

- (instancetype)initWithUIManager:(RCTUIManager *)uiManager;
- (void)setRemovingConfigBlock:(REAAnimationRemovingBlock)block;
- (void)setAnimationStartingBlock:(REAAnimationStartingBlock)startAnimation;
- (void)setHasAnimationBlock:(REAHasAnimationBlock)hasAnimation;
- (void)notifyAboutProgress:(NSDictionary *)newStyle tag:(NSNumber *)tag;
- (void)notifyAboutEnd:(NSNumber *)tag cancelled:(BOOL)cancelled;
- (void)invalidate;
- (void)viewDidMount:(UIView *)view withBeforeSnapshot:(REASnapshot *)snapshot;
- (REASnapshot*)prepareSnapshotBeforeMountForView:(UIView*)view;
- (void)onViewRemoval:(UIView *)view before:(REASnapshot *)before;
- (void)onViewCreate:(UIView *)view after:(REASnapshot *)after;
- (void)onViewUpdate:(UIView *)view before:(REASnapshot *)before after:(REASnapshot *)after;
- (void)setToBeRemovedRegistry:(NSMutableDictionary<NSNumber *, NSMutableSet<id<RCTComponent>> *> *)toBeRemovedRegister;
- (void)removeLeftovers;

@end

NS_ASSUME_NONNULL_END
