#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REABatchObserver.h>

@interface REASwizzledUIManager : NSObject
- (instancetype)initWithUIManager:(RCTUIManager *)uiManager
             withAnimationManager:(REAAnimationsManager *)animationsManager;
@end
