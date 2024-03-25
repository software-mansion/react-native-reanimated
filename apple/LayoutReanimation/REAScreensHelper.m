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

+ (bool)isStackChanged:(REAUIView *)view
{
  NSMutableArray<REAUIView *> *screens = [NSMutableArray new];
  REAUIView *currentView = view;
  while (currentView.reactSuperview != nil) {
    if ([currentView isKindOfClass:[RNSScreenView class]]) {
      [screens addObject:currentView];
    }
    currentView = currentView.reactSuperview;
  }
  for (int i = 1; i < [screens count]; i++) {
    REAUIView *screen = screens[i];
    REAUIView *topViewController = screen.reactViewController.navigationController.topViewController.view;
    if (topViewController != screen) {
      return true;
    }
  }
  return false;
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

+ (bool)isStackChanged:(REAUIView *)view
{
  return false;
}

#endif // LOAD_SCREENS_HEADERS

@end
