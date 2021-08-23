#import <React/RCTUIManager.h>
#import <React/RCTDefines.h>
#import <React/RCTBridge+Private.h>
#import "REAAnimationsManager.h"

NS_ASSUME_NONNULL_BEGIN

@interface REAUIManager : RCTUIManager
@property BOOL blockSetter;
- (void)setBridge:(RCTBridge *)bridge;
- (void)setUp:(REAAnimationsManager*) animationsManager;
- (void)unregisterView:(id<RCTComponent>) view;
@end

NS_ASSUME_NONNULL_END
