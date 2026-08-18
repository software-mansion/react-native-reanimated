#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>
#import <functional>

@interface REATouchHoverCoordinator : NSObject
+ (instancetype)sharedCoordinator;
- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback;
- (void)unregisterObserver:(id)owner;

/// Fallback press path for views UIKit's hit-test cannot reach (alpha < ~0.01): their
/// UILongPressGestureRecognizer never fires, so the window observer drives `:active` instead,
/// and only for views the alpha bump revealed - never for ones the recognizer can serve.
- (void)registerPressObserver:(id)owner
                         view:(UIView *)view
                      deepest:(BOOL)deepest
                     callback:(std::function<void(bool)>)callback;
- (void)unregisterPressObserver:(id)owner;

/// The view this coordinator would drive `:active` for, or nil when it would not act on this
/// touch. `:active-deepest` recognizers ask before claiming a press, since a descendant the
/// coordinator is about to engage outranks them just as a UIKit-reachable one does.
- (UIView *)rescuedPressViewForTouch:(UITouch *)touch inWindow:(UIWindow *)window atPoint:(CGPoint)point;
@end

/// Single-touch gate shared with the recognizers, held from the moment a fallback press engages
/// until the touch sequence ends. Defined with its state in REAPseudoSelectorObserver.mm.
void REAPseudoPressGateRetain(UITouch *touch);
void REAPseudoPressGateRelease(void);

#endif
