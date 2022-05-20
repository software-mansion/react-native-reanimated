package com.swmansion.reanimated.keyboardObserver;

import static android.view.WindowInsetsAnimation.Callback.DISPATCH_MODE_STOP;

import android.os.Build;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsAnimation;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
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

  @RequiresApi(api = Build.VERSION_CODES.R)
  public void subscribeForKeyboardEvents(NativeProxy.KeyboardEventDataUpdater updater) {

    View rootView = reactContext.get().getCurrentActivity().getWindow().getDecorView().getRootView();
    WindowInsetsAnimation.Callback cb = new WindowInsetsAnimation.Callback(DISPATCH_MODE_STOP) {
      int keyboardHeight = 0;
      @NonNull
      @Override
      public WindowInsetsAnimation.Bounds onStart(@NonNull WindowInsetsAnimation animation, @NonNull WindowInsetsAnimation.Bounds bounds) {
        updater.keyboardEventDataUpdater(true, true, keyboardHeight);
        return bounds;
      }

      @NonNull
      @Override
      public WindowInsets onProgress(@NonNull WindowInsets insets, @NonNull List<WindowInsetsAnimation> runningAnimations) {
        keyboardHeight = (int)PixelUtil.toDIPFromPixel(insets.getInsets(WindowInsetsCompat.Type.ime()).bottom);
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

  public void unsubscribeFromKeyboardEvents() {

  }
}
