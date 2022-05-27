#ifndef REAKeyboardEventManager_h
#define REAKeyboardEventManager_h

#import <RNReanimated/REAEventDispatcher.h>
#import <React/RCTEventDispatcher.h>

typedef void (^KeyboardEventListenerBlock)(bool isShown, bool isAnimating, int height);

@interface REAKeyboardEventObserver : NSObject

- (void)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener;
- (void)unsubscribeFromKeyboardEvents;

@end

#endif /* REAKeyboardEventManager_h */
