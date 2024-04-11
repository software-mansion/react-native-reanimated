package com.swmansion.reanimated.keyboard;

import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.Window;
import android.widget.FrameLayout;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.bridge.ReactApplicationContext;
import java.lang.ref.WeakReference;

public class WindowsInsetsManager {

  private boolean mIsStatusBarTranslucent = false;

  private int statusBarHeight = 0;
  private int paddingTop = 0;

  private int paddingBottom = 0;
  private final WeakReference<ReactApplicationContext> mReactContext;
  private final Keyboard mKeyboard;
  private final NotifyAboutKeyboardChangeFunction mNotifyAboutKeyboardChange;

  private final ViewTreeObserver.OnDrawListener statusBarChangeListener =
      new ViewTreeObserver.OnDrawListener() {
        @Override
        public void onDraw() {
          View statusBar = getStatusBarView();
          int currentStatusBarHeight = statusBar.getHeight();
          boolean isStatusBarTranslucent = getWindow().getStatusBarColor() == Color.TRANSPARENT;

          if (isStatusBarTranslucent != mIsStatusBarTranslucent
              || currentStatusBarHeight != statusBarHeight) {
            mIsStatusBarTranslucent = isStatusBarTranslucent;
            statusBarHeight = currentStatusBarHeight;
            updateInsets(paddingTop, paddingBottom);
          }
        }
      };

  public WindowsInsetsManager(
      WeakReference<ReactApplicationContext> reactContext,
      Keyboard keyboard,
      NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
    mReactContext = reactContext;
    mKeyboard = keyboard;
    mNotifyAboutKeyboardChange = notifyAboutKeyboardChange;
  }

  private Window getWindow() {
    return mReactContext.get().getCurrentActivity().getWindow();
  }

  private View getRootView() {
    return getWindow().getDecorView();
  }

  private View getStatusBarView() {
    return getWindow().findViewById(android.R.id.statusBarBackground);
  }

  public void startObservingChanges(
      KeyboardAnimationCallback keyboardAnimationCallback, boolean isStatusBarTranslucent) {
    mIsStatusBarTranslucent = isStatusBarTranslucent;
    updateWindowDecor(false);

    getStatusBarView().getViewTreeObserver().addOnDrawListener(statusBarChangeListener);
    ViewCompat.setOnApplyWindowInsetsListener(getRootView(), this::onApplyWindowInsetsListener);
    ViewCompat.setWindowInsetsAnimationCallback(getRootView(), keyboardAnimationCallback);
  }

  public void stopObservingChanges() {
    updateWindowDecor(!mIsStatusBarTranslucent);
    updateInsets(0, 0);

    getStatusBarView().getViewTreeObserver().removeOnDrawListener(statusBarChangeListener);
    ViewCompat.setWindowInsetsAnimationCallback(getRootView(), null);
    ViewCompat.setOnApplyWindowInsetsListener(getRootView(), null);
  }

  private void updateWindowDecor(boolean decorFitsSystemWindow) {
    new Handler(Looper.getMainLooper())
        .post(() -> WindowCompat.setDecorFitsSystemWindows(getWindow(), decorFitsSystemWindow));
  }

  private WindowInsetsCompat onApplyWindowInsetsListener(View view, WindowInsetsCompat insets) {
    WindowInsetsCompat defaultInsets = ViewCompat.onApplyWindowInsets(view, insets);
    if (mKeyboard.getState() == KeyboardState.OPEN) {
      mKeyboard.updateHeight(insets);
      mNotifyAboutKeyboardChange.call();
    }
    setWindowInsets(defaultInsets);
    return defaultInsets;
  }

  private void setWindowInsets(WindowInsetsCompat insets) {
    int systemBarsTypeMask = WindowInsetsCompat.Type.systemBars();
    paddingTop = insets.getInsets(systemBarsTypeMask).top;
    paddingBottom = insets.getInsets(systemBarsTypeMask).bottom;
    updateInsets(paddingTop, paddingBottom);
  }

  private void updateInsets(int paddingTop, int paddingBottom) {
    new Handler(Looper.getMainLooper())
        .post(
            () -> {
              FrameLayout.LayoutParams params = getLayoutParams(paddingTop, paddingBottom);
              int actionBarId = androidx.appcompat.R.id.action_bar_root;
              View actionBarRootView = getRootView().findViewById(actionBarId);
              actionBarRootView.setLayoutParams(params);
            });
  }

  private FrameLayout.LayoutParams getLayoutParams(int paddingTop, int paddingBottom) {
    int matchParentFlag = FrameLayout.LayoutParams.MATCH_PARENT;
    FrameLayout.LayoutParams params =
        new FrameLayout.LayoutParams(matchParentFlag, matchParentFlag);
    if (mIsStatusBarTranslucent || statusBarHeight == 0) {
      params.setMargins(0, 0, 0, paddingBottom);
    } else {
      params.setMargins(0, paddingTop, 0, paddingBottom);
    }
    return params;
  }
}
