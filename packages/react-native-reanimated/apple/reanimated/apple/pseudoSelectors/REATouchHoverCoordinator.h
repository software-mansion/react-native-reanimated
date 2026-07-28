#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>
#import <functional>

@interface REATouchHoverCoordinator : NSObject
+ (instancetype)sharedCoordinator;
- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback;
- (void)unregisterObserver:(id)owner;
@end

#endif
