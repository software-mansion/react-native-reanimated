package com.swmansion.reanimated;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.HashMap;
import android.graphics.Matrix;
import android.graphics.RectF;
import android.util.Log;
import android.view.View;
import android.view.ViewParent;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.RootViewUtil;
import com.facebook.react.views.scroll.ReactHorizontalScrollView;
import com.facebook.react.views.scroll.ReactScrollView;
import com.facebook.react.views.swiperefresh.ReactSwipeRefreshLayout;

public class NativeMethodsHelper {

  public static float[] measure(View view) {
    View rootView = (View) RootViewUtil.getRootView(view);
    if (rootView == null || view == null) {
      float result[] = new float[6];
      result[0] = -1234567;
      return result;
    }

    int buffer[] = new int[4];
    computeBoundingBox(rootView, buffer);
    int rootX = buffer[0];
    int rootY = buffer[1];
    computeBoundingBox(view, buffer);
    buffer[0] -= rootX;
    buffer[1] -= rootY;

    float result[] = new float[6];
    result[0] = result[1] = 0;
    for (int i = 2; i < 6; ++i) result[i] = PixelUtil.toDIPFromPixel(buffer[i - 2]);

    return result;
  }


  private static final Map<Class<?>, Method> abortAnimationMethodCache = new HashMap<>();

  private static void interruptScrollMomentum(View view, boolean isHorizontal) {
      Class<?> viewClass = view.getClass();
      Method abortAnimationMethod = abortAnimationMethodCache.get(viewClass);

      if (abortAnimationMethod == null && !abortAnimationMethodCache.containsKey(viewClass)) {
          try {
              abortAnimationMethod = viewClass.getMethod("abortAnimation");
              abortAnimationMethodCache.put(viewClass, abortAnimationMethod);
          } catch (NoSuchMethodException e) {
              abortAnimationMethodCache.put(viewClass, null); // Cache the fact that the method doesn't exist
          }
      }

      if (abortAnimationMethod != null) {
          try {
              abortAnimationMethod.invoke(view);
              return;  // Successfully called abortAnimation, so exit.
          } catch (IllegalAccessException | InvocationTargetException e) {}
      }

      // Fallback
      if (isHorizontal) {
          ((ReactHorizontalScrollView) view).smoothScrollBy(0, 0);
          return;
      }
      ((ReactScrollView) view).smoothScrollBy(0, 0);
  }

  private static void handleScroll(View view, int x, int y, boolean isHorizontal, boolean animated) {
    if (!animated) {
        interruptScrollMomentum(view, isHorizontal);
        view.scrollTo(x, y);
        return;
    }

    if (isHorizontal) {
        ((ReactHorizontalScrollView) view).smoothScrollTo(x, y);
        return;
    }

    ((ReactScrollView) view).smoothScrollTo(x, y);
  }



  public static void scrollTo(View view, double argX, double argY, boolean animated) {
    int x = Math.round(PixelUtil.toPixelFromDIP(argX));
    int y = Math.round(PixelUtil.toPixelFromDIP(argY));
    boolean isHorizontal = view instanceof ReactHorizontalScrollView;

    if (!isHorizontal) {
      if (view instanceof ReactSwipeRefreshLayout) {
        view = findScrollView((ReactSwipeRefreshLayout) view);
      }
      if (!(view instanceof ReactScrollView)) {
        Log.w(
            "REANIMATED",
            "NativeMethodsHelper: Unhandled scroll view type - allowed only {ReactScrollView, ReactHorizontalScrollView}");
        return;
      }
    }

      final View finalView = view;
      view.post(() -> handleScroll(finalView, x, y, isHorizontal, animated));
}


  private static ReactScrollView findScrollView(ReactSwipeRefreshLayout view) {
    for (int i = 0; i < view.getChildCount(); i++) {
      if (view.getChildAt(i) instanceof ReactScrollView) {
        return (ReactScrollView) view.getChildAt(i);
      }
    }
    return null;
  }

  private static void computeBoundingBox(View view, int[] outputBuffer) {
    RectF boundingBox = new RectF();
    boundingBox.set(0, 0, view.getWidth(), view.getHeight());
    mapRectFromViewToWindowCoords(view, boundingBox);

    outputBuffer[0] = Math.round(boundingBox.left);
    outputBuffer[1] = Math.round(boundingBox.top);
    outputBuffer[2] = Math.round(boundingBox.right - boundingBox.left);
    outputBuffer[3] = Math.round(boundingBox.bottom - boundingBox.top);
  }

  private static void mapRectFromViewToWindowCoords(View view, RectF rect) {
    Matrix matrix = view.getMatrix();
    if (!matrix.isIdentity()) {
      matrix.mapRect(rect);
    }

    rect.offset(view.getLeft(), view.getTop());

    ViewParent parent = view.getParent();
    while (parent instanceof View) {
      View parentView = (View) parent;

      rect.offset(-parentView.getScrollX(), -parentView.getScrollY());

      matrix = parentView.getMatrix();
      if (!matrix.isIdentity()) {
        matrix.mapRect(rect);
      }

      rect.offset(parentView.getLeft(), parentView.getTop());

      parent = parentView.getParent();
    }
  }
}
