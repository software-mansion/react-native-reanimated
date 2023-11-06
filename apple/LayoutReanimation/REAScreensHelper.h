#define LOAD_SCREENS_HEADERS                                         \
  ((!RCT_NEW_ARCH_ENABLED && __has_include(<RNScreens/RNSScreen.h>)) \
  || (RCT_NEW_ARCH_ENABLED && __has_include(<RNScreens/RNSScreen.h>) && __cplusplus))

#if LOAD_SCREENS_HEADERS
#import <RNScreens/RNSScreen.h>
#import <RNScreens/RNSScreenStack.h>
#endif

#define SCREENS_MODULE_EXISTS __has_include(<RNScreens/RNSModule.h>) && __cplusplus

#if SCREENS_MODULE_EXISTS
#import <RNScreens/RNSModule.h>
#endif

#ifdef __cplusplus
#import <jsi/jsi.h>
#endif

#import <React/RCTBridge.h>

#import <RNReanimated/REAUIKit.h>

@interface REAScreensHelper : NSObject

enum ScreenTransitionCommand {
  Start = 1,
  Update = 2,
  Finish = 3,
};

+ (REAUIView *)getScreenForView:(REAUIView *)view;
+ (REAUIView *)getStackForView:(REAUIView *)view;
+ (bool)isScreenModal:(REAUIView *)screen;
+ (REAUIView *)getScreenWrapper:(REAUIView *)view;
+ (int)getScreenType:(REAUIView *)screen;
+ (bool)isRNSScreenType:(REAUIView *)screen;
#ifdef __cplusplus
typedef facebook::jsi::Value (^ManageScreenTransitionBlock)(
    facebook::jsi::Runtime &rt,
    int command,
    int stackTag,
    const facebook::jsi::Value &param);
+ (ManageScreenTransitionBlock)getManageScreenTransitionFunction:(RCTBridge *)bridge;
#endif

@end
