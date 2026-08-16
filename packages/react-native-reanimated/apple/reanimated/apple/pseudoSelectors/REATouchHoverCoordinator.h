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

/// The view this coordinator would drive `:active` for at `point`, or nil when it would not act
/// there. `:active-deepest` recognizers ask this before claiming a press: a descendant the
/// coordinator is about to engage outranks them, exactly as a UIKit-reachable descendant does.
/// Answers nil for windows it does not observe, so it never suppresses a press nobody rescues.
- (UIView *)rescuedPressViewInWindow:(UIWindow *)window atPoint:(CGPoint)point;
@end

/// One touch drives all presses globally: the recognizers share a gate that admits a single
/// touch, and the coordinator holds the same gate from the moment a fallback press engages
/// until the touch sequence ends - dismissing the press by dragging must not let another
/// finger start one. Defined with the gate state in REAPseudoSelectorObserver.mm.
void REAPseudoPressGateRetain(UITouch *touch);
void REAPseudoPressGateRelease(void);

#endif
