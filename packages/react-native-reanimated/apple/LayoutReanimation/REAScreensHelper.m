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
  if (view == nil) {
    return nil;
  }
  if ([view isKindOfClass:[RNSScreenView class]]) {
    if (view.reactSuperview != nil) {
      if ([view.reactSuperview isKindOfClass:[RNSScreenStackView class]]) {
        return view.reactSuperview;
      }
    }
  }
  REAUIView *currentView = view;
  while (currentView.reactSuperview != nil) {
    if ([currentView isKindOfClass:[RNSScreenStackView class]]) {
      return currentView;
    }
    currentView = currentView.reactSuperview;
  }
  currentView = view;
  while (currentView.superview != nil) {
    if ([currentView isKindOfClass:[RNSScreenStackView class]]) {
      return currentView;
    }
    currentView = currentView.superview;
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

+ (REAUIView *)getActiveTabForTabNavigator:(REAUIView *)tabNavigator
{
  NSArray<REAUIView *> *screenTabs = tabNavigator.reactSubviews;
  for (RNSScreenView *tab in screenTabs) {
    if (tab.activityState == RNSActivityStateOnTop) {
      return tab;
    }
  }
  return nil;
}

+ (REAUIView *)findTopScreenInChildren:(REAUIView *)view
{
  for (REAUIView *child in view.reactSubviews) {
    if ([child isKindOfClass:[RNSScreenStackView class]]) {
      int screenCount = [child.reactSubviews count];
      if (screenCount != 0) {
        REAUIView *topScreen = child.reactSubviews[[child.reactSubviews count] - 1];
        REAUIView *maybeChildScreen = [REAScreensHelper findTopScreenInChildren:topScreen];
        if (maybeChildScreen) {
          return maybeChildScreen;
        }
        if (topScreen) {
          return topScreen;
        }
      }
    }
    REAUIView *topScreen = [REAScreensHelper findTopScreenInChildren:child];
    if (topScreen != nil) {
      return topScreen;
    }
  }
  if ([view isKindOfClass:[RNSScreenView class]]) {
    return view;
  }
  return nil;
}

+ (bool)isView:(REAUIView *)view DescendantOfScreen:(REAUIView *)screen
{
  REAUIView *currentView = view;
  while (currentView.reactSuperview) {
    if (currentView == screen) {
      return true;
    }
    currentView = currentView.reactSuperview;
  }
  return false;
}

+ (bool)isViewOnTopOfScreenStack:(REAUIView *)view
{
  NSMutableArray<REAUIView *> *screens = [NSMutableArray new];
  REAUIView *currentView = view;
  while (currentView.reactSuperview != nil) {
    if ([currentView isKindOfClass:[RNSScreenView class]]) {
      [screens addObject:currentView];
    }
    currentView = currentView.reactSuperview;
  }
  for (int i = 0; i < [screens count]; i++) {
    REAUIView *screen = screens[i];
    REAUIView *container = screen.reactSuperview;
    if ([container isKindOfClass:[RNSScreenStackView class]]) {
      if (screen.reactSuperview.reactSubviews.lastObject != screen) {
        return false;
      }
    }
    if ([container isKindOfClass:[RNSScreenNavigationContainerView class]]) {
      if ([REAScreensHelper getActiveTabForTabNavigator:container] != screen) {
        return false;
      }
    }
  }
  return true;
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

@end
