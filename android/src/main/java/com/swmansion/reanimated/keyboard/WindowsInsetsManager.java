package com.swmansion.reanimated.keyboard;

import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.widget.FrameLayout;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

public class WindowsInsetsManager {

  private boolean mIsStatusBarTranslucent = false;

  private final Keyboard mKeyboard;

  private final NotifyAboutKeyboardChangeFunction mNotifyAboutKeyboardChange;

  private final ModalActivityManager mModalActivityManager;

  private boolean isObservingChanges = false;

  public WindowsInsetsManager(
      ModalActivityManager modalActivityManager,
      Keyboard keyboard,
      NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
    mKeyboard = keyboard;
    mModalActivityManager = modalActivityManager;
    mNotifyAboutKeyboardChange = notifyAboutKeyboardChange;
  }

  private Window getWindow() {
    return mModalActivityManager.getCurrentWindow();
  }

  private View getRootView() {
    return getWindow().getDecorView();
  }

  public boolean getIsObservingChanges() {
    return isObservingChanges;
  }

  public void startObservingChanges(
      NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange, boolean isStatusBarTranslucent) {
    isObservingChanges = true;
    mIsStatusBarTranslucent = isStatusBarTranslucent;
    updateWindowDecor(false);
    View rootView = getRootView();
    KeyboardAnimationCallback mKeyboardAnimationCallback =
        new KeyboardAnimationCallback(mKeyboard, notifyAboutKeyboardChange);
    ViewCompat.setOnApplyWindowInsetsListener(rootView, this::onApplyWindowInsetsListener);
    ViewCompat.setWindowInsetsAnimationCallback(rootView, mKeyboardAnimationCallback);
  }

  public void stopObservingChanges() {
    isObservingChanges = false;
    updateWindowDecor(!mIsStatusBarTranslucent);
    updateInsets(0, 0);
    View rootView = getRootView();
    ViewCompat.setWindowInsetsAnimationCallback(rootView, null);
    ViewCompat.setOnApplyWindowInsetsListener(rootView, null);
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
              View actionBarRootView = getRootView().findViewById(actionBarId);
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
