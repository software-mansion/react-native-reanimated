#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>
#import <functional>

/// Drives touch `:hover` to match mobile Chromium: a tap makes the touched view's hit-path sticky
/// (`committed`), while a pan/scroll never changes the committed `:hover` (the live `displayed` state
/// rolls back to it on release, or as soon as scrolling starts). Only the first finger counts; later
/// fingers are ignored until it lifts. A single passive key-window touch observer feeds this.
@interface REATouchHoverCoordinator : NSObject
+ (instancetype)sharedCoordinator;
- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback;
- (void)unregisterObserver:(id)owner;
@end

#endif
