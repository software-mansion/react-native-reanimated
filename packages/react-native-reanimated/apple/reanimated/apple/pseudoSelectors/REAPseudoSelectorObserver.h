#pragma once

#import <reanimated/apple/REAUIView.h>

#import <functional>
#import <string>

NS_ASSUME_NONNULL_BEGIN

/**
 * Attaches a native event observer to a UIView for a single pseudo-selector.
 * Calls the C++ callback with `true` when the selector becomes active,
 * `false` when it becomes inactive.
 *
 * Supported selectors:
 *   ":active"  — UILongPressGestureRecognizer with minimumPressDuration = 0
 *   ":focus"   — NSNotificationCenter UITextFieldTextDidBeginEditing/DidEndEditing
 *   ":hover"   — UIHoverGestureRecognizer (iOS 13+, pointer/trackpad/mouse devices)
 *
 * Lifetime: store as an associated object on the UIView so it is
 * automatically released when the view is deallocated.
 */
@interface REAPseudoSelectorObserver : NSObject

- (instancetype)initWithView:(REAUIView *)view
                    selector:(NSString *)selectorName
                    callback:(std::function<void(bool)>)callback;

- (void)detach;

@end

NS_ASSUME_NONNULL_END
