#import <Foundation/Foundation.h>
#import <React/RCTUIManager.h>
#import "REASnapshot.h"

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, ViewState) {
  Appearing,
  Disappearing,
  Layout,
  Inactive,
  ToRemove,
};

@interface REAAnimationsManager : NSObject

- (instancetype)initWithUIManager:(RCTUIManager*)uiManager;
- (void)setRemovingConfigBlock:(void (^)(NSNumber *tag))block;
- (void)setAnimationStartingBlock:(void (^)(NSNumber *tag, NSString *type, NSDictionary* target, NSNumber* depth))startAnimation;
- (void)notifyAboutProgress:(NSDictionary *)newStyle tag:(NSNumber*)tag;
- (void)notifyAboutEnd:(NSNumber*)tag cancelled:(BOOL)cancelled;
- (void)invalidate;
- (void) onViewRemoval:(UIView*)view parent:(NSObject*)parent before:(REASnapshot*)before;
- (void) onViewCreate:(UIView*)view parent:(UIView*)parent after:(REASnapshot*)after;
- (void) onViewUpdate:(UIView*)view before:(REASnapshot*)before after:(REASnapshot*)after;
- (void) setToBeRemovedRegistry:(NSMutableDictionary<NSNumber*, NSMutableSet<id<RCTComponent>>*>*) toBeRemovedRegister;

@end

NS_ASSUME_NONNULL_END
