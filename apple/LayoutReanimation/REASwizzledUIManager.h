#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REABatchObserver.h>

@interface REASwizzledUIManager : NSObject
@property REABatchObserver *batchObserver;
- (instancetype)initWithUIManager:(RCTUIManager *)uiManager
             withAnimationManager:(REAAnimationsManager *)animationsManager;
@end
