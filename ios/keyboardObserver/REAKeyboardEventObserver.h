#ifndef REAKeyboardEventManager_h
#define REAKeyboardEventManager_h

#import <RNReanimated/REAEventDispatcher.h>
#import <React/RCTEventDispatcher.h>

typedef void (^KeyboardEventListenerBlock)(int keyboardState, int height);

@interface REAKeyboardEventObserver : NSObject

@property (nonatomic) BOOL enabled;

- (instancetype)initWithEventListenerBlock:(KeyboardEventListenerBlock)listener;

@end

#endif /* REAKeyboardEventManager_h */
