#import <RNReanimated/REAScreensHelper.h>

@implementation REAScreensHelper

#if LOAD_SCREENS_HEADERS

+ (REAUIView *)getScreenForView:(REAUIView *)view
{
  REAUIView *screen = view;
  while (![screen isKindOfClass:[RNSScreenView class]] && screen.superview != nil) {
    screen = screen.superview;
  }
  if ([screen isKindOfClass:[RNSScreenView class]]) {
    return screen;
  }
  return nil;
}

+ (REAUIView *)getStackForView:(REAUIView *)view
{
  if ([view isKindOfClass:[RNSScreenView class]]) {
    if (view.reactSuperview != nil) {
      if ([view.reactSuperview isKindOfClass:[RNSScreenStackView class]]) {
        return view.reactSuperview;
      }
    }
  }
  while (view != nil && ![view isKindOfClass:[RNSScreenStackView class]] && view.superview != nil) {
    view = view.superview;
  }
  if ([view isKindOfClass:[RNSScreenStackView class]]) {
    return view;
  }
  return nil;
}

+ (bool)isScreenModal:(REAUIView *)uiViewScreen
{
  if ([uiViewScreen isKindOfClass:[RNSScreenView class]]) {
    RNSScreenView *screen = (RNSScreenView *)uiViewScreen;
    bool isModal = [screen isModal];
    if (!isModal) {
      // case for modal with header
      RNSScreenView *parentScreen = (RNSScreenView *)[REAScreensHelper getScreenForView:screen.reactSuperview];
      if (parentScreen != nil) {
        isModal = [parentScreen isModal];
      }
    }
    return isModal;
  }
  return false;
}

+ (REAUIView *)getScreenWrapper:(REAUIView *)view
{
  REAUIView *screen = [REAScreensHelper getScreenForView:view];
  REAUIView *stack = [REAScreensHelper getStackForView:screen];
  REAUIView *screenWrapper = [REAScreensHelper getScreenForView:stack];
  return screenWrapper;
}

+ (int)getScreenType:(REAUIView *)screen;
{
  return [[screen valueForKey:@"stackPresentation"] intValue];
}

+ (bool)isRNSScreenType:(REAUIView *)view
{
  return [view isKindOfClass:[RNSScreen class]] == YES;
}

#else

+ (REAUIView *)getScreenForView:(REAUIView *)view
{
  return nil;
}

+ (REAUIView *)getStackForView:(REAUIView *)view
{
  return nil;
}

+ (bool)isScreenModal:(REAUIView *)screen
{
  return false;
}

+ (REAUIView *)getScreenWrapper:(REAUIView *)view
{
  return nil;
}

+ (int)getScreenType:(REAUIView *)screen;
{
  return 0;
}

+ (bool)isRNSScreenType:(REAUIView *)screen
{
  return false;
}

#endif // LOAD_SCREENS_HEADERS

#if SCREENS_MODULE_EXISTS

+ (ManageScreenTransitionBlock)getManageScreenTransitionFunction:(RCTBridge *)bridge
{
  __block RNSModule *screensModule = [bridge moduleForClass:[RNSModule class]];
  return ^facebook::jsi::Value(facebook::jsi::Runtime &rt, int command, int stackTag, const facebook::jsi::Value &param)
  {
    NSNumber *nsScreenTag = @(stackTag);
    if (command == ScreenTransitionCommand::Start) {
      NSArray<NSNumber *> *screenTags = [screensModule _startTransition:nsScreenTag];
      if ([screenTags count] > 0) {
        facebook::jsi::Object screenTagsObject(rt);
        screenTagsObject.setProperty(rt, "topScreenTag", [screenTags[0] intValue]);
        screenTagsObject.setProperty(rt, "belowTopScreenTag", [screenTags[1] intValue]);
        return screenTagsObject;
      }
    } else if (command == ScreenTransitionCommand::Update) {
      double progress = param.asNumber();
      [screensModule _updateTransition:nsScreenTag progress:progress];
    } else if (command == ScreenTransitionCommand::Finish) {
      bool canceled = param.asBool();
      [screensModule _finishTransition:nsScreenTag canceled:canceled];
    }
    return facebook::jsi::Value::undefined();
  };
}

#else

#ifdef __cplusplus
+ (ManageScreenTransitionBlock)getManageScreenTransitionFunction:(RCTBridge *)bridge
{
  return ^(facebook::jsi::Runtime &rt, int command, int stackTag, const facebook::jsi::Value &param) {
    return facebook::jsi::Value::undefined();
  };
}
#endif

#endif // SCREENS_MODULE_EXISTS

@end
