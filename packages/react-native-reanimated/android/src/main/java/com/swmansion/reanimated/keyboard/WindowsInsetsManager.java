package com.swmansion.reanimated.keyboard;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.FrameLayout;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.bridge.ReactApplicationContext;
import java.lang.ref.WeakReference;

public class WindowsInsetsManager {

  private boolean mIsStatusBarTranslucent = false;
  private boolean mIsNavigationBarTranslucent = false;
  private final WeakReference<ReactApplicationContext> mReactContext;
  private final Keyboard mKeyboard;
  private final NotifyAboutKeyboardChangeFunction mNotifyAboutKeyboardChange;

  private final String MissingContextErrorMsg = "Unable to get reference to react activity";

  public WindowsInsetsManager(
      WeakReference<ReactApplicationContext> reactContext,
      Keyboard keyboard,
      NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
    mReactContext = reactContext;
    mKeyboard = keyboard;
    mNotifyAboutKeyboardChange = notifyAboutKeyboardChange;
  }

  private Activity getCurrentActivity() {
    return mReactContext.get().getCurrentActivity();
  }

  public void startObservingChanges(
      KeyboardAnimationCallback keyboardAnimationCallback,
      boolean isStatusBarTranslucent,
      boolean isNavigationBarTranslucent) {
    mIsStatusBarTranslucent = isStatusBarTranslucent;
    mIsNavigationBarTranslucent = isNavigationBarTranslucent;
    updateWindowDecor(false);

    Activity currentActivity = getCurrentActivity();
    if (currentActivity == null) {
      Log.e("Reanimated", MissingContextErrorMsg);
      return;
    }

    View rootView = currentActivity.getWindow().getDecorView();
    ViewCompat.setOnApplyWindowInsetsListener(rootView, this::onApplyWindowInsetsListener);
    ViewCompat.setWindowInsetsAnimationCallback(rootView, keyboardAnimationCallback);
  }

  public void stopObservingChanges() {
    updateWindowDecor(!mIsStatusBarTranslucent && !mIsNavigationBarTranslucent);
    updateInsets(0, 0);

    Activity currentActivity = getCurrentActivity();
    if (currentActivity == null) {
      Log.e("Reanimated", MissingContextErrorMsg);
      return;
    }

    View rootView = currentActivity.getWindow().getDecorView();
    ViewCompat.setWindowInsetsAnimationCallback(rootView, null);
    ViewCompat.setOnApplyWindowInsetsListener(rootView, null);
  }

  private void updateWindowDecor(boolean decorFitsSystemWindow) {
    new Handler(Looper.getMainLooper())
        .post(
            () -> {
              Activity currentActivity = getCurrentActivity();
              if (currentActivity == null) {
                Log.e("Reanimated", MissingContextErrorMsg);
                return;
              }

              WindowCompat.setDecorFitsSystemWindows(
                  currentActivity.getWindow(), decorFitsSystemWindow);
            });
  }

  private WindowInsetsCompat onApplyWindowInsetsListener(View view, WindowInsetsCompat insets) {
    WindowInsetsCompat defaultInsets = ViewCompat.onApplyWindowInsets(view, insets);
    if (mKeyboard.getState() == KeyboardState.OPEN) {
      mKeyboard.updateHeight(insets, mIsNavigationBarTranslucent);
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

              Activity currentActivity = getCurrentActivity();
              if (currentActivity == null) {
                Log.e("Reanimated", MissingContextErrorMsg);
                return;
              }

              View actionBarRootView =
                  currentActivity.getWindow().getDecorView().findViewById(actionBarId);
              actionBarRootView.setLayoutParams(params);
            });
  }

  private FrameLayout.LayoutParams getLayoutParams(int paddingTop, int paddingBottom) {
    int matchParentFlag = FrameLayout.LayoutParams.MATCH_PARENT;
    FrameLayout.LayoutParams params =
        new FrameLayout.LayoutParams(matchParentFlag, matchParentFlag);

    params.setMargins(
        0,
        mIsStatusBarTranslucent ? 0 : paddingTop,
        0,
        mIsNavigationBarTranslucent ? 0 : paddingBottom);
    return params;
  }
}
