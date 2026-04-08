#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>

@interface REACSSAnimations : NSObject

- (void)applyCSSAnimationsForView:(REAUIView *)view animations:(NSArray *)animations;

- (void)removeAllAnimationsForView:(REAUIView *)view;

@end
