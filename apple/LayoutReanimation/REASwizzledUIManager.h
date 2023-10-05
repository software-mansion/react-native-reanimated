#import <RNReanimated/REAAnimationsManager.h>

@interface REASwizzledUIManager : NSObject
- (void)setIsViewTreesSynchronized:(NSNumber *)isViewTreesSynchronized;
- (instancetype)initWithUIManager:(RCTUIManager *)uiManager
             withAnimationManager:(REAAnimationsManager *)animationsManager;
@end
