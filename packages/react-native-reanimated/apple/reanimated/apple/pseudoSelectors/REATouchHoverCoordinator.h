#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>
#import <functional>

/// Drives touch `:hover` (Chromium model): touching a view makes it (and its registered ancestors)
/// `:hover`, dropping any previously-hovered view on that same touch-down. The `:hover` then stays for
/// the whole gesture - through moves and scrolls - and is dropped on release only when the finger
/// lifts off the view without having scrolled. Only the first finger counts; later fingers are ignored
/// until it lifts. A single passive key-window touch observer feeds this.
@interface REATouchHoverCoordinator : NSObject
+ (instancetype)sharedCoordinator;
- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback;
- (void)unregisterObserver:(id)owner;
@end

#endif
