//
//  REAKeyboardEventManager.h
//  Pods
//
//  Created by Kacper Kafara on 29/12/2021.
//

#ifndef REAKeyboardEventManager_h
#define REAKeyboardEventManager_h

#import <RNReanimated/REAEventDispatcher.h>
#import <React/RCTEventDispatcher.h>

@interface REAKeyboardEventObserver : NSObject

- (id)initWithEventDispatcher:(RCTEventDispatcher *)eventDispatcher;

- (void)registerKeyboardEventsObservers;

- (void)keyboardDidChangeFrame:(NSNotification *)notification;
- (void)keyboardWillChangeFrame:(NSNotification *)notification;

- (void)keyboardDidShow:(NSNotification *)notification;
- (void)keyboardWillShow:(NSNotification *)notification;

- (void)keyboardDidHide:(NSNotification *)notification;
- (void)keyboardWillHide:(NSNotification *)notification;
- (void)unregisterObservers;

@end

#endif /* REAKeyboardEventManager_h */
