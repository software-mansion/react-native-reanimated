#import <Foundation/Foundation.h>
#import "REASnapshooter.h"
#import <React/RCTUIManager.h>

NS_ASSUME_NONNULL_BEGIN

@interface REAAnimationsManager : NSObject

- (instancetype)initWithUIManager:(RCTUIManager*)uiManager;

- (void)notifyAboutChangeWithBeforeSnapshots:(REASnapshooter*)beforeSnapshooter afterSnapshooter:(REASnapshooter*)afterSnapshooter;

- (void)setRemovingConfigBlock:(void (^)(NSNumber *tag))block;
- (void)setAnimationStartingBlock:(void (^)(NSNumber *tag, NSString *type, NSDictionary* target, NSNumber* depth))startAnimation;
- (void)notifyAboutProgress:(NSDictionary *)newStyle tag:(NSNumber*)tag;
- (void)notifyAboutEnd:(NSNumber*)tag cancelled:(BOOL)cancelled;
- (void)addBlockOnAnimationEnd:(NSNumber*)tag block:(void (^)(void))block;

- (void)invalidate;

@end

NS_ASSUME_NONNULL_END
