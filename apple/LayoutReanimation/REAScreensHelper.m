#import <RNReanimated/REAScreensHelper.h>

#import <React/RCTUIKit.h>

@implementation REAScreensHelper

#if LOAD_SCREENS_HEADERS

+ (RCTUIView *)getScreenForView:(RCTUIView *)view
{
  RCTUIView *screen = view;
  while (![screen isKindOfClass:[RNSScreenView class]] && screen.superview != nil) {
    screen = screen.superview;
  }
  if ([screen isKindOfClass:[RNSScreenView class]]) {
    return screen;
  }
  return nil;
}

+ (RCTUIView *)getStackForView:(RCTUIView *)view
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

+ (bool)isScreenModal:(RCTUIView *)uiViewScreen
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

+ (RCTUIView *)getScreenWrapper:(RCTUIView *)view
{
  RCTUIView *screen = [REAScreensHelper getScreenForView:view];
  RCTUIView *stack = [REAScreensHelper getStackForView:screen];
  RCTUIView *screenWrapper = [REAScreensHelper getScreenForView:stack];
  return screenWrapper;
}

+ (int)getScreenType:(RCTUIView *)screen;
{
  return [[screen valueForKey:@"stackPresentation"] intValue];
}

+ (bool)isRNSScreenType:(RCTUIView *)view
{
  return [view isKindOfClass:[RNSScreen class]] == YES;
}

#else

+ (RCTUIView *)getScreenForView:(RCTUIView *)view
{
  return nil;
}

+ (RCTUIView *)getStackForView:(RCTUIView *)view
{
  return nil;
}

+ (bool)isScreenModal:(RCTUIView *)screen
{
  return false;
}

+ (RCTUIView *)getScreenWrapper:(RCTUIView *)view
{
  return nil;
}

+ (int)getScreenType:(RCTUIView *)screen;
{
  return 0;
}

+ (bool)isRNSScreenType:(RCTUIView *)screen
{
  return false;
}

#endif // LOAD_SCREENS_HEADERS

@end
