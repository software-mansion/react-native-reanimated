package com.swmansion.reanimated.keyboardObserver;

import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.FrameLayout;
import androidx.annotation.NonNull;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsAnimationCompat;
import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.PixelUtil;
import com.swmansion.reanimated.NativeProxy;
import java.lang.ref.WeakReference;
import java.util.List;

public class ReanimatedKeyboardEventListener {
  private final WeakReference<ReactApplicationContext> reactContext;

  public ReanimatedKeyboardEventListener(WeakReference<ReactApplicationContext> reactContext) {
    this.reactContext = reactContext;
  }

  private View getRootView() {
    return reactContext.get().getCurrentActivity().getWindow().getDecorView();
  }

  public void subscribeForKeyboardEvents(NativeProxy.KeyboardEventDataUpdater updater) {
    View rootView = getRootView();

    new Handler(Looper.getMainLooper())
        .post(
            () -> {
              WindowCompat.setDecorFitsSystemWindows(
                  reactContext.get().getCurrentActivity().getWindow(), false);
              ViewCompat.setOnApplyWindowInsetsListener(
                  rootView,
                  (v, insets) -> {
                    int paddingBottom =
                        insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
                    int paddingTop = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
                    View content =
                        rootView
                            .getRootView()
                            .findViewById(com.swmansion.reanimated.R.id.action_bar_root);

                    FrameLayout.LayoutParams params =
                        new FrameLayout.LayoutParams(
                            FrameLayout.LayoutParams.MATCH_PARENT,
                            FrameLayout.LayoutParams.MATCH_PARENT);
                    params.setMargins(0, paddingTop, 0, paddingBottom);
                    content.setLayoutParams(params);

                    return insets;
                  });
            });

    WindowInsetsAnimationCompat.Callback cb =
        new WindowInsetsAnimationCompat.Callback(
            WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
          int keyboardHeight = 0;

          @NonNull
          @Override
          public WindowInsetsAnimationCompat.BoundsCompat onStart(
              @NonNull WindowInsetsAnimationCompat animation,
              @NonNull WindowInsetsAnimationCompat.BoundsCompat bounds) {
            updater.keyboardEventDataUpdater(true, true, keyboardHeight);
            return super.onStart(animation, bounds);
          }

          @NonNull
          @Override
          public WindowInsetsCompat onProgress(
              @NonNull WindowInsetsCompat insets,
              @NonNull List<WindowInsetsAnimationCompat> runningAnimations) {

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
          public void onEnd(@NonNull WindowInsetsAnimationCompat animation) {
            updater.keyboardEventDataUpdater(keyboardHeight > 0, false, keyboardHeight);
          }
        };
    ViewCompat.setWindowInsetsAnimationCallback(rootView, cb);
  }

  public void unsubscribeFromKeyboardEvents() {
    new Handler(Looper.getMainLooper())
        .post(
            () -> {
              WindowCompat.setDecorFitsSystemWindows(
                  reactContext.get().getCurrentActivity().getWindow(), true);
              ViewCompat.setOnApplyWindowInsetsListener(getRootView(), null);
              ViewCompat.setWindowInsetsAnimationCallback(getRootView(), null);
              View content =
                  getRootView()
                      .getRootView()
                      .findViewById(com.swmansion.reanimated.R.id.action_bar_root);

              FrameLayout.LayoutParams params =
                  new FrameLayout.LayoutParams(
                      FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
              params.setMargins(0, 0, 0, 0);
              content.setLayoutParams(params);
            });
  }
}
