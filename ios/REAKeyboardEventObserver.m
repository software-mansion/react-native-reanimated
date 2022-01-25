//
//  REAKeyboardEventManager.m
//  RNReanimated
//
//  Created by Kacper Kafara on 29/12/2021.
//

#import "REAKeyboardEventObserver.h"
#import <Foundation/Foundation.h>
#import <React/RCTDefines.h>

@implementation REAKeyboardEventObserver {
  REAEventDispatcher *dispatcher;
  NSNotificationCenter *notificationCenter;
}

- (instancetype)init
{
  return [self initWithEventDispatcher:nil];
}

- (instancetype)initWithEventDispatcher:(REAEventDispatcher *)eventDispatcher
{
  if (self = [super init]) {
    dispatcher = eventDispatcher;
    notificationCenter = [NSNotificationCenter defaultCenter];
  }

  return self;
}

- (void)keyboardDidChangeFrame:(NSNotification *)notification
{
  double duration = [notification.userInfo[UIKeyboardAnimationCurveUserInfoKey] doubleValue];
  NSLog(@"keyboardDidChangeFrame call, duration=%lf", duration);
}

- (void)keyboardWillChangeFrame:(NSNotification *)notification
{
  double duration = [notification.userInfo[UIKeyboardAnimationCurveUserInfoKey] doubleValue];
  NSLog(@"keyboardWillChangeFrame call, duration=%lf", duration);
}

- (void)keyboardDidHide:(NSNotification *)notification
{
  double duration = [notification.userInfo[UIKeyboardAnimationCurveUserInfoKey] doubleValue];
  NSLog(@"keyboardDidHide call, duration=%lf", duration);
}

- (void)keyboardWillHide:(NSNotification *)notification
{
  double duration = [notification.userInfo[UIKeyboardAnimationCurveUserInfoKey] doubleValue];
  NSLog(@"keyboardWillHide call, duration=%lf", duration);
}

- (void)keyboardDidShow:(NSNotification *)notification
{
  double duration = [notification.userInfo[UIKeyboardAnimationCurveUserInfoKey] doubleValue];
  NSLog(@"keyboardDidShow call, duration=%lf", duration);
}

- (void)keyboardWillShow:(NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  CGRect beginFrame = [userInfo[UIKeyboardFrameBeginUserInfoKey] CGRectValue];
  CGRect endFrame = [userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
  NSTimeInterval duration = [userInfo[UIKeyboardAnimationDurationUserInfoKey] doubleValue];
  UIViewAnimationCurve curve = (UIViewAnimationCurve)([userInfo[UIKeyboardAnimationCurveUserInfoKey] integerValue]);
  NSInteger isLocalUserInfoKey = [userInfo[UIKeyboardIsLocalUserInfoKey] integerValue];

  //    id<RCTEvent> event = []
  //    [dispatcher sendEvent:<#(id<RCTEvent>)#>]
}

- (void)registerKeyboardEventsObservers
{
  [notificationCenter addObserver:self
                         selector:@selector(keyboardWillChangeFrame:)
                             name:UIKeyboardWillChangeFrameNotification
                           object:nil];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardWillHide:)
                             name:UIKeyboardWillHideNotification
                           object:nil];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardWillShow:)
                             name:UIKeyboardWillShowNotification
                           object:nil];

  [notificationCenter addObserver:self
                         selector:@selector(keyboardDidChangeFrame:)
                             name:UIKeyboardDidChangeFrameNotification
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

- (void)unregisterObservers
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

@end
