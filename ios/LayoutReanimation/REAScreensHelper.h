#define LOAD_SCREENS_HEADERS                                         \
  ((!RCT_NEW_ARCH_ENABLED && __has_include(<RNScreens/RNSScreen.h>)) \
  || (RCT_NEW_ARCH_ENABLED && __has_include(<RNScreens/RNSScreen.h>) && __cplusplus))

// available since 3.21.0
#define SCREENS_HAS_UTILS __has_include(<RNScreens/RNSUtils.h>)

#if LOAD_SCREENS_HEADERS
#import <RNScreens/RNSScreen.h>
#import <RNScreens/RNSScreenStack.h>
#if SCREENS_HAS_UTILS
#import <RNScreens/RNSUtils.h>
#endif // SCREENS_HAS_UTILS
#endif // LOAD_SCREENS_HEADERS

@interface REAScreensHelper : NSObject

+ (UIView *)getScreenForView:(UIView *)view;
+ (UIView *)getStackForView:(UIView *)view;
+ (bool)isScreenModal:(UIView *)screen;
+ (UIView *)getScreenWrapper:(UIView *)view;
+ (int)getScreenType:(UIView *)screen;
+ (bool)isRNSScreenType:(UIView *)screen;
+ (NSNumber *)getDefaultHeaderSize;

@end
