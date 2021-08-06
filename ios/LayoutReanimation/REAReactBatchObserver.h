#import <Foundation/Foundation.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>
#import "REAAnimationsManager.h"
#import "REASnapshot.h"

NS_ASSUME_NONNULL_BEGIN

@interface REAReactBatchObserver : NSObject <RCTUIManagerObserver>

@property (nullable) REAAnimationsManager* animationsManager;

@property NSMutableSet<NSNumber*>* alreadySeen;
@property NSMutableDictionary<NSString*, NSObject*>* parents;
@property NSMutableDictionary<NSString*, REASnapshot*>* snapshotsOfRemoved;
@property BOOL deactivate;
@property BOOL forceRemove;

- (void) invalidate;
- (instancetype)initWithBridge:(RCTBridge*)bridge;

+ (NSMutableSet<NSNumber*>*) animationRootsTags;

@end

NS_ASSUME_NONNULL_END
