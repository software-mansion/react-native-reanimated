#import "REAKeyboardEventObserver.h"
#import <Foundation/Foundation.h>
#import <React/RCTDefines.h>

@implementation REAKeyboardEventObserver {
  KeyboardEventListenerBlock listener;
  CADisplayLink *displayLink;
  CGFloat prevKeyboardTopPosition;
  int _windowsCount;
}

// copied from
// https://github.com/tonlabs/UIKit/blob/bd5651e4723d547bde0cb86ca1c27813cedab4a9/casts/keyboard/ios/UIKitKeyboardIosFrameListener.m
- (UIView *)findKeyboardView
{
  for (UIWindow *window in [UIApplication.sharedApplication.windows objectEnumerator]) {
    if ([window isKindOfClass:NSClassFromString(@"UITextEffectsWindow")]) {
      for (UIView *containerView in window.subviews) {
        if ([containerView isKindOfClass:NSClassFromString(@"UIInputSetContainerView")]) {
          for (UIView *hostView in containerView.subviews) {
            if ([hostView isKindOfClass:NSClassFromString(@"UIInputSetHostView")]) {
              return hostView;
            }
          }
        }
      }
    }
  }
  return nil;
}

- (UIView *)keyboardView
{
  /**
   * If the count of windows has changed it means there might be a new UITextEffectsWindow,
   * thus we have to obtain a new `keyboardView`
   */
  int windowsCount = [UIApplication.sharedApplication.windows count];

  if (_keyboardView == nil || windowsCount != _windowsCount) {
    _keyboardView = [self findKeyboardView];
    _windowsCount = windowsCount;
  }
  return _keyboardView;
}

- (void)keyboardDidHide:(NSNotification *)notification
{
  self->listener(false, false, 0);
  [displayLink invalidate];
  displayLink = nil;
}

- (void)keyboardWillHide:(NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  CGRect frameStart = [userInfo[UIKeyboardFrameBeginUserInfoKey] CGRectValue];
  self->listener(true, true, frameStart.size.height);
}

- (void)keyboardDidShow:(NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  CGRect frameEnd = [userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
  self->listener(true, false, frameEnd.size.height);
}

- (void)keyboardWillShow:(NSNotification *)notification
{
  self->listener(true, true, 0);

  displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(updateKeyboardFrame)];
  [displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
}

- (void)updateKeyboardFrame
{
  if (self.keyboardView == nil) {
    return;
  }

  CGFloat keyboardFrameY = [self.keyboardView.layer presentationLayer].frame.origin.y;
  CGFloat keyboardWindowH = self.keyboardView.window.bounds.size.height;
  CGFloat keyboardTopPosition = keyboardWindowH - keyboardFrameY;

  if (keyboardTopPosition == prevKeyboardTopPosition) {
    return;
  }

  prevKeyboardTopPosition = keyboardTopPosition;
  self->listener(true, true, keyboardTopPosition);
}

- (void)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener
{
  self->listener = listener;
  prevKeyboardTopPosition = 0;
  _windowsCount = 0;
  NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardWillHide:)
                             name:UIKeyboardWillHideNotification
                           object:nil];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardWillShow:)
                             name:UIKeyboardWillShowNotification
                           object:nil];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardDidHide:)
                             name:UIKeyboardDidHideNotification
                           object:nil];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardDidShow:)
                             name:UIKeyboardDidShowNotification
                           object:nil];
}

- (void)unsubscribeFromKeyboardEvents
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

@end
