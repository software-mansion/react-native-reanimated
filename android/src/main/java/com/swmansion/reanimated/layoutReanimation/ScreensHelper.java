package com.swmansion.reanimated.layoutReanimation;

import android.view.View;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

public class ScreensHelper {

  public static View getTabNavigator(View view) {
    View currentView = view;
    while (currentView != null) {
      if (currentView.getClass().getSimpleName().equals("ScreenContainer")) {
        return currentView;
      }
      if (currentView.getClass().getSimpleName().equals("Screen")
              && currentView.getParent() != null
              && currentView.getParent().getClass().getSimpleName().equals("ScreensCoordinatorLayout")) {
        View screen = currentView;
        Class<?> screenClass = screen.getClass();
        try {
          Method getContainer = screenClass.getMethod("getContainer");
          currentView = (View)getContainer.invoke(screen);
        } catch (NoSuchMethodException | InvocationTargetException | IllegalAccessException ignored) {}
      } else if (currentView.getParent() instanceof View) {
        currentView = (View) currentView.getParent();
      } else {
        break;
      }
    }
    return null;
  }

  public static boolean isChildOfScreen(View view, View screen) {
    View currentView = view;
    while (currentView != null) {
      if (currentView == screen) {
        return true;
      }
      if (!(currentView.getParent() instanceof View)) {
        return false;
      }
      currentView = (View) currentView.getParent();
    }
    return false;
  }

  public static View getTopScreenForStack(View stack) {
    if (stack.getClass().getSimpleName().equals("ScreenStack")) {
      Class<?> screenStackClass = stack.getClass();
      try {
        Method getTopScreen = screenStackClass.getMethod("getTopScreen");
        return (View)getTopScreen.invoke(stack);
      } catch (NoSuchMethodException | InvocationTargetException | IllegalAccessException ignored) {}
    }
    return null;
  }

}
