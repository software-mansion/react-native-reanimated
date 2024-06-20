package com.swmansion.reanimated.keyboard;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.FrameLayout;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import javax.annotation.Nullable;

abstract class InsetsManager {

  private boolean mIsStatusBarTranslucent = false;

  private final Keyboard mKeyboard;

  private final NotifyAboutKeyboardChangeFunction mNotifyAboutKeyboardChange;

  private boolean isObservingChanges = false;

  private final String MissingContextErrorMsg = "Unable to get reference to react activity";

  public InsetsManager(
      Keyboard keyboard, NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
    mKeyboard = keyboard;
    mNotifyAboutKeyboardChange = notifyAboutKeyboardChange;
  }

  abstract @Nullable Window getWindow();

  public void startObservingChanges(
      NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange, boolean isStatusBarTranslucent) {
    if (isObservingChanges) {
      return;
    }

    isObservingChanges = true;
    mIsStatusBarTranslucent = isStatusBarTranslucent;
    updateWindowDecor(false);

    Window window = getWindow();
    if (window == null) {
      Log.e("Reanimated", MissingContextErrorMsg);
      return;
    }

    View rootView = window.getDecorView();
    KeyboardAnimationCallback mKeyboardAnimationCallback =
        new KeyboardAnimationCallback(mKeyboard, notifyAboutKeyboardChange);
    ViewCompat.setOnApplyWindowInsetsListener(rootView, this::onApplyWindowInsetsListener);
    ViewCompat.setWindowInsetsAnimationCallback(rootView, mKeyboardAnimationCallback);
  }

  public void stopObservingChanges() {
    isObservingChanges = false;
    updateWindowDecor(!mIsStatusBarTranslucent);
    updateInsets(0, 0);

    Window window = getWindow();
    if (window == null) {
      Log.e("Reanimated", MissingContextErrorMsg);
      return;
    }

    View rootView = window.getDecorView();
    ViewCompat.setWindowInsetsAnimationCallback(rootView, null);
    ViewCompat.setOnApplyWindowInsetsListener(rootView, null);
  }

  private void updateWindowDecor(boolean decorFitsSystemWindow) {
    new Handler(Looper.getMainLooper())
        .post(
            () -> {
              Window window = getWindow();
              if (window == null) {
                Log.e("Reanimated", MissingContextErrorMsg);
                return;
              }

              WindowCompat.setDecorFitsSystemWindows(window, decorFitsSystemWindow);
            });
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
    int paddingTop = insets.getInsets(systemBarsTypeMask).top;
    int paddingBottom = insets.getInsets(systemBarsTypeMask).bottom;
    updateInsets(paddingTop, paddingBottom);
  }

  private void updateInsets(int paddingTop, int paddingBottom) {
    new Handler(Looper.getMainLooper())
        .post(
            () -> {
              FrameLayout.LayoutParams params = getLayoutParams(paddingTop, paddingBottom);
              int actionBarId = androidx.appcompat.R.id.action_bar_root;

              Window window = getWindow();
              if (window == null) {
                Log.e("Reanimated", MissingContextErrorMsg);
                return;
              }

              View actionBarRootView = window.getDecorView().findViewById(actionBarId);
              if (actionBarRootView != null) {
                actionBarRootView.setLayoutParams(params);
              }
            });
  }

  private FrameLayout.LayoutParams getLayoutParams(int paddingTop, int paddingBottom) {
    int matchParentFlag = FrameLayout.LayoutParams.MATCH_PARENT;
    FrameLayout.LayoutParams params =
        new FrameLayout.LayoutParams(matchParentFlag, matchParentFlag);
    if (mIsStatusBarTranslucent) {
      params.setMargins(0, 0, 0, paddingBottom);
    } else {
      params.setMargins(0, paddingTop, 0, paddingBottom);
    }
    return params;
  }
}
