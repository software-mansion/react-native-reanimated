package com.swmansion.reanimated.keyboardObserver;

import static android.view.WindowInsetsAnimation.Callback.DISPATCH_MODE_STOP;

import android.graphics.Rect;
import android.os.Build;
import android.view.DisplayCutout;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.WindowInsets;
import android.view.WindowInsetsAnimation;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.DisplayMetricsHolder;
import com.facebook.react.uimanager.PixelUtil;
import com.swmansion.reanimated.NativeProxy;
import java.lang.ref.WeakReference;
import java.util.List;

public class ReanimatedKeyboardEventListener {
  private final WeakReference<ReactApplicationContext> reactContext;
  private CustomGlobalLayoutListener globalLayoutListener;

  public ReanimatedKeyboardEventListener(WeakReference<ReactApplicationContext> reactContext) {
    this.reactContext = reactContext;
  }

  public void subscribeForKeyboardEvents(NativeProxy.KeyboardEventDataUpdater updater) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      subscribeForKeyboardEventsR(updater);
    } else {
      subscribeForKeyboardEventsFallback(updater);
    }
  }

  private View getRootView() {
    return reactContext.get().getCurrentActivity().getWindow().getDecorView().getRootView();
  }

  @RequiresApi(api = Build.VERSION_CODES.R)
  public void subscribeForKeyboardEventsR(NativeProxy.KeyboardEventDataUpdater updater) {
    View rootView = getRootView();
    WindowInsetsAnimation.Callback cb =
        new WindowInsetsAnimation.Callback(DISPATCH_MODE_STOP) {
          int keyboardHeight = 0;

          @NonNull
          @Override
          public WindowInsetsAnimation.Bounds onStart(
              @NonNull WindowInsetsAnimation animation,
              @NonNull WindowInsetsAnimation.Bounds bounds) {
            updater.keyboardEventDataUpdater(true, true, keyboardHeight);
            return bounds;
          }

          @NonNull
          @Override
          public WindowInsets onProgress(
              @NonNull WindowInsets insets,
              @NonNull List<WindowInsetsAnimation> runningAnimations) {
            keyboardHeight =
                (int)
                    PixelUtil.toDIPFromPixel(
                        Math.max(
                            0,
                            insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
                                - insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom));
            updater.keyboardEventDataUpdater(true, true, keyboardHeight);
            return insets;
          }

          @Override
          public void onEnd(@NonNull WindowInsetsAnimation animation) {
            updater.keyboardEventDataUpdater(keyboardHeight > 0, false, keyboardHeight);
          }
        };
    rootView.setWindowInsetsAnimationCallback(cb);
  }

  private class CustomGlobalLayoutListener implements ViewTreeObserver.OnGlobalLayoutListener {
    private final Rect mVisibleViewArea;
    private final int mMinKeyboardHeightDetected;
    private final NativeProxy.KeyboardEventDataUpdater mUpdater;

    private int mKeyboardHeight = 0;

    public CustomGlobalLayoutListener(NativeProxy.KeyboardEventDataUpdater updater) {
      DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(
          reactContext.get().getApplicationContext());
      mVisibleViewArea = new Rect();
      mMinKeyboardHeightDetected = (int) PixelUtil.toPixelFromDIP(60);
      mUpdater = updater;
    }

    @Override
    public void onGlobalLayout() {
      checkForKeyboardEvents();
    }

    private void checkForKeyboardEvents() {
      View rootView = getRootView();
      rootView.getWindowVisibleDisplayFrame(mVisibleViewArea);
      int notchHeight = 0;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        WindowInsets insets = rootView.getRootWindowInsets();
        if (insets != null) {
          DisplayCutout displayCutout = insets.getDisplayCutout();
          if (displayCutout != null) {
            notchHeight = displayCutout.getSafeInsetTop();
          }
        }
      }
      final int heightDiff =
          DisplayMetricsHolder.getWindowDisplayMetrics().heightPixels
              - mVisibleViewArea.bottom
              + notchHeight;

      boolean isKeyboardShowingOrKeyboardHeightChanged =
          mKeyboardHeight != heightDiff && heightDiff > mMinKeyboardHeightDetected;
      if (isKeyboardShowingOrKeyboardHeightChanged) {
        mKeyboardHeight = heightDiff;
        mUpdater.keyboardEventDataUpdater(
            true, false, (int) PixelUtil.toDIPFromPixel(mKeyboardHeight));
        return;
      }

      boolean isKeyboardHidden = mKeyboardHeight != 0 && heightDiff <= mMinKeyboardHeightDetected;
      if (isKeyboardHidden) {
        mKeyboardHeight = 0;
        mUpdater.keyboardEventDataUpdater(false, false, 0);
      }
    }
  }

  public void subscribeForKeyboardEventsFallback(NativeProxy.KeyboardEventDataUpdater updater) {
    ViewTreeObserver observer = getRootView().getViewTreeObserver();
    globalLayoutListener = new CustomGlobalLayoutListener(updater);
    observer.addOnGlobalLayoutListener(globalLayoutListener);
  }

  public void unsubscribeFromKeyboardEvents() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      getRootView().setWindowInsetsAnimationCallback(null);
    } else {
      ViewTreeObserver observer = getRootView().getViewTreeObserver();
      observer.removeOnGlobalLayoutListener(globalLayoutListener);
    }
  }
}
