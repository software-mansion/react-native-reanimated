#ifndef REAKeyboardEventManager_h
#define REAKeyboardEventManager_h

#import <RNReanimated/REAEventDispatcher.h>
#import <React/RCTEventDispatcher.h>

typedef void (^KeyboardEventListenerBlock)(bool isShown, bool isAnimating, int height);

@interface REAKeyboardEventObserver : NSObject

@property (nonatomic, assign) UIView *keyboardView;

- (void)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener;
- (void)unsubscribeFromKeyboardEvents;

@end

#endif /* REAKeyboardEventManager_h */
