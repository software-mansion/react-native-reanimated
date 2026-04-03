#pragma once

#import <reanimated/PseudoStyles/PseudoSelector.h>
#import <reanimated/apple/REAUIView.h>

#import <functional>

NS_ASSUME_NONNULL_BEGIN

/**
 * Attaches a native event observer to a UIView for a single pseudo-selector.
 * Calls the C++ callback with `true` when the selector becomes active,
 * `false` when it becomes inactive.
 *
 * Supported selectors:
 *   Active - UILongPressGestureRecognizer with minimumPressDuration = 0
 *   Focus  - NSNotificationCenter UITextFieldTextDidBeginEditing/DidEndEditing
 *   Hover  - UIHoverGestureRecognizer (iOS 13+, pointer/trackpad/mouse devices)
 *
 * Lifetime: store as an associated object on the UIView so it is
 * automatically released when the view is deallocated.
 */
@interface REAPseudoSelectorObserver : NSObject

- (instancetype)initWithView:(REAUIView *)view
                    selector:(reanimated::PseudoSelector)selector
                    callback:(std::function<void(bool)>)callback;

- (void)detach;

@end

NS_ASSUME_NONNULL_END
