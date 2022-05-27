#import "REAKeyboardEventObserver.h"
#import <Foundation/Foundation.h>
#import <React/RCTDefines.h>

@implementation REAKeyboardEventObserver {
  KeyboardEventListenerBlock listener;
}

- (void)keyboardDidHide:(NSNotification *)notification
{
  self->listener(false, false, 0);
}

- (void)keyboardWillHide:(NSNotification *)notification
{
  self->listener(true, true, 0);
}

- (void)keyboardDidShow:(NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  CGRect frameEnd = [userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
  self->listener(true, false, frameEnd.size.height);
    
}

- (void)keyboardWillShow:(NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  CGRect frameEnd = [userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
  self->listener(true, true, frameEnd.size.height);
}

- (void)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener
{
  self->listener = listener;
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
