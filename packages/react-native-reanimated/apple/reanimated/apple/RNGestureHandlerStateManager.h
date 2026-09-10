#import <Foundation/Foundation.h>

@protocol RNGestureHandlerStateManager

- (void)setGestureState:(int)state forHandler:(int)handlerTag;

@end
