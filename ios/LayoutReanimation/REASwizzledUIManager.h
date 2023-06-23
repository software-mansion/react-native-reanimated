#import <RNReanimated/REAAnimationsManager.h>

@interface REASwizzledUIManager : NSObject
- (instancetype)initWithUIManager:(RCTUIManager *)uiManager
            withAnimatioinManager:(REAAnimationsManager *)animationsManager;
@end
