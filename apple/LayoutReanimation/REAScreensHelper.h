#define LOAD_SCREENS_HEADERS                                         \
  ((!RCT_NEW_ARCH_ENABLED && __has_include(<RNScreens/RNSScreen.h>)) \
  || (RCT_NEW_ARCH_ENABLED && __has_include(<RNScreens/RNSScreen.h>) && __cplusplus))

#if LOAD_SCREENS_HEADERS
#import <RNScreens/RNSScreen.h>
#import <RNScreens/RNSScreenStack.h>
#endif

#import <RNReanimated/REAUIKit.h>

@interface REAScreensHelper : NSObject

+ (RNAUIView *)getScreenForView:(RNAUIView *)view;
+ (RNAUIView *)getStackForView:(RNAUIView *)view;
+ (bool)isScreenModal:(RNAUIView *)screen;
+ (RNAUIView *)getScreenWrapper:(RNAUIView *)view;
+ (int)getScreenType:(RNAUIView *)screen;
+ (bool)isRNSScreenType:(RNAUIView *)screen;

@end
