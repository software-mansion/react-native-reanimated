#import <RNReanimated/REAScreensHelper.h>

#import <RNReanimated/REAUIKit.h>

@implementation REAScreensHelper

#if LOAD_SCREENS_HEADERS

+ (RNAUIView *)getScreenForView:(RNAUIView *)view
{
  RNAUIView *screen = view;
  while (![screen isKindOfClass:[RNSScreenView class]] && screen.superview != nil) {
    screen = screen.superview;
  }
  if ([screen isKindOfClass:[RNSScreenView class]]) {
    return screen;
  }
  return nil;
}

+ (RNAUIView *)getStackForView:(RNAUIView *)view
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

+ (bool)isScreenModal:(RNAUIView *)uiViewScreen
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

+ (RNAUIView *)getScreenWrapper:(RNAUIView *)view
{
  RNAUIView *screen = [REAScreensHelper getScreenForView:view];
  RNAUIView *stack = [REAScreensHelper getStackForView:screen];
  RNAUIView *screenWrapper = [REAScreensHelper getScreenForView:stack];
  return screenWrapper;
}

+ (int)getScreenType:(RNAUIView *)screen;
{
  return [[screen valueForKey:@"stackPresentation"] intValue];
}

+ (bool)isRNSScreenType:(RNAUIView *)view
{
  return [view isKindOfClass:[RNSScreen class]] == YES;
}

#else

+ (RNAUIView *)getScreenForView:(RNAUIView *)view
{
  return nil;
}

+ (RNAUIView *)getStackForView:(RNAUIView *)view
{
  return nil;
}

+ (bool)isScreenModal:(RNAUIView *)screen
{
  return false;
}

+ (RNAUIView *)getScreenWrapper:(RNAUIView *)view
{
  return nil;
}

+ (int)getScreenType:(RNAUIView *)screen;
{
  return 0;
}

+ (bool)isRNSScreenType:(RNAUIView *)screen
{
  return false;
}

#endif // LOAD_SCREENS_HEADERS

@end
