package com.swmansion.reanimated.layoutReanimation;

import android.util.Log;
import android.view.View;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

public class ScreensHelper {

  public static View getTabNavigator(View view) {
    View currentView = view;
    while (currentView != null) {
      if (isScreenContainer(currentView)) {
        return currentView;
      }
      if (isScreen(currentView) && isScreensCoordinatorLayout(currentView.getParent())) {
        View screen = currentView;
        Class<?> screenClass = screen.getClass();
        try {
          Method getContainer = screenClass.getMethod("getContainer");
          currentView = (View) getContainer.invoke(screen);
        } catch (NoSuchMethodException | InvocationTargetException | IllegalAccessException e) {
          String message =
              e.getMessage() != null ? e.getMessage() : "Unable to invoke the getContainer method";
          Log.e("[Reanimated]", message);
          break;
        }
      } else if (currentView.getParent() instanceof View) {
        currentView = (View) currentView.getParent();
      } else {
        break;
      }
    }
    return null;
  }

  public static boolean isViewChildOfScreen(View view, View screen) {
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

  public static View getTopScreenForStack(View view) {
    if (isScreenStack(view)) {
      View stack = view;
      Class<?> screenStackClass = stack.getClass();
      try {
        Method getTopScreen = screenStackClass.getMethod("getTopScreen");
        return (View) getTopScreen.invoke(stack);
      } catch (NoSuchMethodException | InvocationTargetException | IllegalAccessException ignored) {
      }
    }
    return view;
  }

  public static boolean isScreen(Object maybeView) {
    return isInstanceOf(maybeView, "Screen");
  }

  public static boolean isScreenStack(Object maybeView) {
    return isInstanceOf(maybeView, "ScreenStack");
  }

  public static boolean isScreenContainer(Object maybeView) {
    return isInstanceOf(maybeView, "ScreenContainer");
  }

  public static boolean isScreensCoordinatorLayout(Object maybeView) {
    return isInstanceOf(maybeView, "ScreensCoordinatorLayout");
  }

  public static boolean isScreenFragment(Object maybeView) {
    return isInstanceOf(maybeView, "ScreenFragment");
  }

  private static boolean isInstanceOf(Object maybeView, String className) {
    return maybeView != null && maybeView.getClass().getSimpleName().equals(className);
  }
}
