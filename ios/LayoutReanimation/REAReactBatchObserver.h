#import <Foundation/Foundation.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>
#import "REAAnimationsManager.h"

NS_ASSUME_NONNULL_BEGIN

@interface REAReactBatchObserver : NSObject <RCTUIManagerObserver>

@property (nullable) REAAnimationsManager* animationsManager;

- (void) invalidate;
- (instancetype)initWithBridge:(RCTBridge*)bridge;

+ (NSMutableSet<NSNumber*>*) animationRootsTags;

@end

NS_ASSUME_NONNULL_END
