#import "REAKeyboardEventObserver.h"
#import <Foundation/Foundation.h>
#import <React/RCTDefines.h>

@implementation REAKeyboardEventObserver {
  KeyboardEventListenerBlock listener;
}

- (void)keyboardDidChangeFrame:(NSNotification *)notification
{
  // TODO(jgonet)
  NSLog(@"keyboardDidChangeFrame, %@", notification.userInfo);
}

- (void)keyboardWillChangeFrame:(NSNotification *)notification
{
  // TODO(jgonet)
  NSLog(@"keyboardWillChangeFrame, %@", notification.userInfo);
}

- (void)keyboardDidHide:(NSNotification *)notification
{
  self->listener(false, false, 0);
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
  self->listener(false, true, 0);
}

- (void)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener
{
  self->listener = listener;
  NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];
  //  [notificationCenter addObserver:self
  //                         selector:@selector(keyboardWillChangeFrame:)
  //                             name:UIKeyboardWillChangeFrameNotification
  //                           object:nil];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardWillHide:)
                             name:UIKeyboardWillHideNotification
                           object:nil];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardWillShow:)
                             name:UIKeyboardWillShowNotification
                           object:nil];

  //  [notificationCenter addObserver:self
  //                         selector:@selector(keyboardDidChangeFrame:)
  //                             name:UIKeyboardDidChangeFrameNotification
  //                           object:nil];

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
