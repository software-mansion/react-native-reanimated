#import <React/RCTUIManager.h>
#import <React/RCTDefines.h>
#import <React/RCTBridge+Private.h>
#import "REAAnimationsManager.h"

NS_ASSUME_NONNULL_BEGIN

@interface REAUIManager : RCTUIManager
@property BOOL blockSetter;
@property REAAnimationsManager* animationsManager;
- (void)setBridge:(RCTBridge *)bridge;
@end

NS_ASSUME_NONNULL_END
