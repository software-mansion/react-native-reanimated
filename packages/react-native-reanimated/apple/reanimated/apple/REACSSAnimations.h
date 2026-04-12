#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>

@interface REACSSAnimations : NSObject

- (void)applyCSSPlatformAnimations:(REAUIView *)view animations:(NSArray *)animations;

- (void)removeCSSPlatformAnimations:(REAUIView *)view;

@end
