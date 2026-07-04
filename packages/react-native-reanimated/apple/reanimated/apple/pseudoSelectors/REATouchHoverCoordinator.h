#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>
#import <functional>

/// Sticky touch `:hover`: a touch-down hovers the views on its hit branch and unhovers the rest; the
/// first finger's release keeps a view hovered only if the finger is still over it (moves and scrolls
/// change nothing, later fingers are ignored). A single passive key-window touch observer feeds this.
@interface REATouchHoverCoordinator : NSObject
+ (instancetype)sharedCoordinator;
- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback;
- (void)unregisterObserver:(id)owner;
@end

#endif
