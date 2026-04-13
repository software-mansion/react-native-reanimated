#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>

#include <reanimated/apple/CSS/config.h>

NSDictionary *convertPlatformAnimationConfigToObjC(const reanimated::css::PlatformAnimationConfig &config);

@interface REACSSAnimations : NSObject

- (void)applyPlatformAnimation:(REAUIView *)view animation:(NSDictionary *)animation;
- (void)removePlatformAnimation:(REAUIView *)view name:(NSString *)name;
- (void)removeAllPlatformAnimations:(REAUIView *)view;

@end
