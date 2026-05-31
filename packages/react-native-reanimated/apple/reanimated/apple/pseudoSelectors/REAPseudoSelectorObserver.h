#pragma once

#import <reanimated/PseudoStyles/PseudoSelector.h>
#import <reanimated/apple/REAUIView.h>

#import <functional>

NS_ASSUME_NONNULL_BEGIN

/**
 * Attaches a native event observer to a view for a single pseudo-selector.
 * Calls the C++ callback with `true` when the selector becomes active,
 * `false` when it becomes inactive.
 *
 * Supported selectors:
 *   Active        - iOS: UILongPressGestureRecognizer (minimumPressDuration = 0)
 *                   macOS: NSPressGestureRecognizer (minimumPressDuration = 0)
 *   ActiveDeepest - Same as Active, but only fires on the deepest descendant
 *   Focus         - iOS: UITextField/UITextView editing notifications
 *                   macOS: NSWindow.firstResponder KVO observation
 *   FocusWithin   - Same as Focus, but matches any descendant gaining focus
 *   Hover         - iOS: UIHoverGestureRecognizer (iOS 13+)
 *                   macOS: NSTrackingArea (mouseEntered/mouseExited)
 *                   tvOS: no-op (UIHoverGestureRecognizer is unavailable);
 *                         the observer is constructed but never fires.
 *
 * Lifetime: store as an associated object on the view so it is
 * automatically released when the view is deallocated.
 */
@interface REAPseudoSelectorObserver : NSObject

- (instancetype)initWithView:(REAUIView *)view
                    selector:(reanimated::PseudoSelector)selector
                    callback:(std::function<void(bool)>)callback;

- (void)detach;

@end

NS_ASSUME_NONNULL_END
