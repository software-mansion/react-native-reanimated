#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>
#import <functional>

@interface REATouchHoverCoordinator : NSObject
+ (instancetype)sharedCoordinator;
- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback;
- (void)unregisterObserver:(id)owner;

/// Fallback press path for views UIKit's hit-test cannot reach (alpha < ~0.01). The per-view
/// UILongPressGestureRecognizer never fires for them, so the window observer drives `:active`
/// through the same alpha-bumped hit-test that touch `:hover` uses. Activates an entry only
/// when the touch lands on it thanks to the bump, so it never races the recognizer.
- (void)registerPressObserver:(id)owner
                         view:(UIView *)view
                      deepest:(BOOL)deepest
                     callback:(std::function<void(bool)>)callback;
- (void)unregisterPressObserver:(id)owner;
@end

#endif
