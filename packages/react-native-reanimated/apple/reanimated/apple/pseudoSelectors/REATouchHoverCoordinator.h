#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>
#import <functional>

/// Drives sticky touch `:hover` (Chromium model): a tapped view stays `:hover` after the finger
/// lifts, clearing only when a later touch lands elsewhere or a scroll cancels it. A single passive
/// key-window touch observer recomputes which registered views contain each touch-down.
@interface REATouchHoverCoordinator : NSObject
+ (instancetype)sharedCoordinator;
- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback;
- (void)unregisterObserver:(id)owner;
@end

#endif
