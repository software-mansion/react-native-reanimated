package com.swmansion.reanimated.keyboard;

import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.widget.FrameLayout;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.bridge.ReactApplicationContext;
import com.swmansion.reanimated.BuildConfig;
import java.lang.ref.WeakReference;

public class WindowsInsetsManager {

  private boolean isStatusBarTranslucent = false;
  private final WeakReference<ReactApplicationContext> reactContext;
  private final Keyboard keyboard;
  private final NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange;

  public WindowsInsetsManager(
    WeakReference<ReactApplicationContext> reactContext,
    Keyboard keyboard,
    NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange
  ) {
    this.reactContext = reactContext;
    this.keyboard = keyboard;
    this.notifyAboutKeyboardChange = notifyAboutKeyboardChange;
  }

  private Window getWindow() {
    return reactContext.get().getCurrentActivity().getWindow();
  }

  private View getRootView() {
    return getWindow().getDecorView();
  }

  public void startObservingChanges(
    KeyboardAnimationCallback keyboardAnimationCallback,
    boolean isStatusBarTranslucent
  ) {
    this.isStatusBarTranslucent = isStatusBarTranslucent;
    updateWindowDecor(false);
    ViewCompat.setOnApplyWindowInsetsListener(getRootView(), this::onApplyWindowInsetsListener);
    ViewCompat.setWindowInsetsAnimationCallback(getRootView(), keyboardAnimationCallback);
  }

  public void stopObservingChanges() {
    updateWindowDecor(!isStatusBarTranslucent);
    updateInsets(0, 0);
    View rootView = getRootView();
    ViewCompat.setWindowInsetsAnimationCallback(rootView, null);
    ViewCompat.setOnApplyWindowInsetsListener(rootView, null);
  }

  private void updateWindowDecor(boolean decorFitsSystemWindow) {
    new Handler(Looper.getMainLooper()).post(
      () -> WindowCompat.setDecorFitsSystemWindows(getWindow(), decorFitsSystemWindow)
    );
  }

  private WindowInsetsCompat onApplyWindowInsetsListener(View view, WindowInsetsCompat insets) {
    if (keyboard.getState() == KeyboardState.OPEN) {
      keyboard.updateHeight(insets);
      notifyAboutKeyboardChange.call();
    }
    setWindowInsets(insets);
    return insets;
  }

  private void setWindowInsets(WindowInsetsCompat insets) {
    int paddingBottom = 0;
    boolean isOldPaperImplementation =
      !BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      && BuildConfig.REACT_NATIVE_MINOR_VERSION < 70;
    if (isOldPaperImplementation) {
      int navigationBarTypeMask = WindowInsetsCompat.Type.navigationBars();
      paddingBottom = insets.getInsets(navigationBarTypeMask).bottom;
    }
    int systemBarsTypeMask = WindowInsetsCompat.Type.systemBars();
    int paddingTop = insets.getInsets(systemBarsTypeMask).top;
    updateInsets(paddingTop, paddingBottom);
  }

  private void updateInsets(int paddingTop, int paddingBottom) {
    new Handler(Looper.getMainLooper()).post(() -> {
      FrameLayout.LayoutParams params = getLayoutParams(paddingTop, paddingBottom);
      int actionBarId = androidx.appcompat.R.id.action_bar_root;
      View actionBarRootView = getRootView().findViewById(actionBarId);
      actionBarRootView.setLayoutParams(params);
    });
  }

  private FrameLayout.LayoutParams getLayoutParams(int paddingTop, int paddingBottom) {
    int matchParent = FrameLayout.LayoutParams.MATCH_PARENT;
    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(matchParent, matchParent);
    if (isStatusBarTranslucent) {
      params.setMargins(0, 0, 0, 0);
    } else {
      params.setMargins(0, paddingTop, 0, paddingBottom);
    }
    return params;
  }
}
