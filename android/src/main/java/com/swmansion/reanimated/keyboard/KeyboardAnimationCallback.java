package com.swmansion.reanimated.keyboard;

import androidx.annotation.NonNull;
import androidx.core.view.WindowInsetsAnimationCompat;
import androidx.core.view.WindowInsetsCompat;
import java.util.List;

public class KeyboardAnimationCallback extends WindowInsetsAnimationCompat.Callback {
  private final Keyboard mKeyboard;
  private final NotifyAboutKeyboardChangeFunction mNotifyAboutKeyboardChange;
  private static final int CONTENT_TYPE_MASK = WindowInsetsCompat.Type.ime();

  public KeyboardAnimationCallback(
      Keyboard keyboard, NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
    super(WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE);
    mNotifyAboutKeyboardChange = notifyAboutKeyboardChange;
    mKeyboard = keyboard;
  }

  @NonNull
  @Override
  public WindowInsetsAnimationCompat.BoundsCompat onStart(
      @NonNull WindowInsetsAnimationCompat animation,
      @NonNull WindowInsetsAnimationCompat.BoundsCompat bounds) {
    if (!isKeyboardAnimation(animation)) {
      return bounds;
    }
    mKeyboard.onAnimationStart();
    mNotifyAboutKeyboardChange.call();
    return super.onStart(animation, bounds);
  }

  @NonNull
  @Override
  public WindowInsetsCompat onProgress(
      @NonNull WindowInsetsCompat insets,
      @NonNull List<WindowInsetsAnimationCompat> runningAnimations) {
    boolean isAnyKeyboardAnimationRunning = false;
    for (WindowInsetsAnimationCompat animation : runningAnimations) {
      if (isKeyboardAnimation(animation)) {
        isAnyKeyboardAnimationRunning = true;
        break;
      }
    }
    if (isAnyKeyboardAnimationRunning) {
      mKeyboard.updateHeight(insets);
      mNotifyAboutKeyboardChange.call();
    }
    return insets;
  }

  @Override
  public void onEnd(@NonNull WindowInsetsAnimationCompat animation) {
    if (isKeyboardAnimation(animation)) {
      mKeyboard.onAnimationEnd();
      mNotifyAboutKeyboardChange.call();
    }
  }

  private static boolean isKeyboardAnimation(@NonNull WindowInsetsAnimationCompat animation) {
    return (animation.getTypeMask() & CONTENT_TYPE_MASK) != 0;
  }
}
