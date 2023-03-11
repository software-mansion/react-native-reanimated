package com.swmansion.reanimated.layoutReanimation;

import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import java.lang.reflect.Field;
import javax.annotation.Nullable;

public class ScreensHelper {
  @Nullable
  public static View findScreen(View view) {
    ViewParent parent = view.getParent();
    while (parent != null) {
      if (parent.getClass().getSimpleName().equals("Screen")) {
        return (View) parent;
      }
      parent = parent.getParent();
    }
    return null;
  }

  @Nullable
  public static View findStack(View view) {
    ViewParent parent = view.getParent();
    while (parent != null) {
      if (parent.getClass().getSimpleName().equals("ScreenStack")) {
        return (View) parent;
      }
      parent = parent.getParent();
    }
    return null;
  }

  public static boolean hasScreenHeader(View screen) {
    try {
      View headerConfig = ((ViewGroup) screen).getChildAt(0);
      Field field = headerConfig.getClass().getDeclaredField("mIsHidden");
      field.setAccessible(true);
      return !field.getBoolean(headerConfig);
    } catch (NullPointerException | NoSuchFieldException | IllegalAccessException e) {
      return false;
    }
  }
}
