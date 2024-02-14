package com.swmansion.reanimated.keyboard;

import androidx.annotation.NonNull;
import androidx.core.view.WindowInsetsAnimationCompat;
import androidx.core.view.WindowInsetsCompat;
import java.util.List;

public class KeyboardAnimationCallback extends WindowInsetsAnimationCompat.Callback {
  private final Keyboard keyboard;
  private final NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange;

  public KeyboardAnimationCallback(
      Keyboard keyboard, NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
    super(WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE);
    this.notifyAboutKeyboardChange = notifyAboutKeyboardChange;
    this.keyboard = keyboard;
  }

  @NonNull
  @Override
  public WindowInsetsAnimationCompat.BoundsCompat onStart(
      @NonNull WindowInsetsAnimationCompat animation,
      @NonNull WindowInsetsAnimationCompat.BoundsCompat bounds) {
    if (!isKeyboardAnimation(animation)) {
      return bounds;
    }
    keyboard.onAnimationStart();
    notifyAboutKeyboardChange.call();
    return super.onStart(animation, bounds);
  }

  @NonNull
  @Override
  public WindowInsetsCompat onProgress(
      @NonNull WindowInsetsCompat insets,
      @NonNull List<WindowInsetsAnimationCompat> runningAnimations) {
    boolean isAnyKeyboardAnimation = false;
    for (WindowInsetsAnimationCompat animation : runningAnimations) {
      if (isKeyboardAnimation(animation)) {
        isAnyKeyboardAnimation = true;
        break;
      }
    }
    if (!isAnyKeyboardAnimation) {
      return insets;
    }
    keyboard.updateHeight(insets);
    notifyAboutKeyboardChange.call();
    return insets;
  }

  @Override
  public void onEnd(@NonNull WindowInsetsAnimationCompat animation) {
    if (!isKeyboardAnimation(animation)) {
      return;
    }
    keyboard.onAnimationEnd();
    notifyAboutKeyboardChange.call();
  }

  private boolean isKeyboardAnimation(@NonNull WindowInsetsAnimationCompat animation) {
    return (animation.getTypeMask() & WindowInsetsCompat.Type.ime()) != 0;
  }
}
