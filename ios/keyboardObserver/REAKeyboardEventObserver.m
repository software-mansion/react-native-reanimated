#import "REAKeyboardEventObserver.h"
#import <Foundation/Foundation.h>
#import <React/RCTDefines.h>

@implementation REAKeyboardEventObserver

- (instancetype)init
{
  self = [super init];
  _listeners = [[NSMutableDictionary alloc] init];
  _nextListenerId = @0;
  return self;
}

#if TARGET_OS_TV
- (int)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener
{
  NSLog(@"Keyboard handling is not supported on tvOS");
  return 0;
}

- (void)unsubscribeFromKeyboardEvents:(int)listenerId
{
  NSLog(@"Keyboard handling is not supported on tvOS");
}
#else

- (void)updateKeyboard:(bool)isShown isAnimating:(bool)isAnimating keyboardHeight:(int)keyboardHeight
{
  for (NSString *key in _listeners.allKeys) {
    ((KeyboardEventListenerBlock)_listeners[key])(isShown, isAnimating, keyboardHeight);
  }
}

- (void)keyboardDidHide:(NSNotification *)notification
{
  [self updateKeyboard:false isAnimating:false keyboardHeight:0];
}

- (void)keyboardWillHide:(NSNotification *)notification
{
  [self updateKeyboard:true isAnimating:true keyboardHeight:0];
}

- (void)keyboardDidShow:(NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  CGRect frameEnd = [userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
  [self updateKeyboard:true isAnimating:false keyboardHeight:frameEnd.size.height];
}

- (void)keyboardWillShow:(NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  CGRect frameEnd = [userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
  [self updateKeyboard:true isAnimating:true keyboardHeight:frameEnd.size.height];
}

- (int)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener
{
  NSNumber *listenerId = [_nextListenerId copy];
  _nextListenerId = [NSNumber numberWithInt:[_nextListenerId intValue] + 1];
  if ([_listeners count] == 0) {
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

  [_listeners setObject:listener forKey:listenerId];
  return [listenerId intValue];
}

- (void)unsubscribeFromKeyboardEvents:(int)listenerId
{
  NSNumber *_listenerId = [NSNumber numberWithInt:listenerId];
  [_listeners removeObjectForKey:_listenerId];
  if ([_listeners count] == 0) {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
  }
}
#endif

@end
