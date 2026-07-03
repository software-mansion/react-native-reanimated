#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>
#import <functional>

/// Drives sticky touch `:hover`: only the touch-down and release locations matter. A touch-down hovers
/// the views on its hit branch (and unhovers the rest, including on blank space), and when the first
/// finger lifts, a hovered view stays hovered only if the finger is still over it - moves and scrolls
/// in between change nothing. Later fingers are ignored until the first lifts. A single passive
/// key-window touch observer feeds this.
@interface REATouchHoverCoordinator : NSObject
+ (instancetype)sharedCoordinator;
- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback;
- (void)unregisterObserver:(id)owner;
@end

#endif
