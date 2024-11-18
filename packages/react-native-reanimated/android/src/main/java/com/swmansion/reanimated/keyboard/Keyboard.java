package com.swmansion.reanimated.keyboard;

import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.uimanager.PixelUtil;

public class Keyboard {
  private KeyboardState mState = KeyboardState.UNKNOWN;
  private int mHeight = 0;
  private int mActiveTransitionCounter = 0;
  private static final int CONTENT_TYPE_MASK = WindowInsetsCompat.Type.ime();
  private static final int SYSTEM_BAR_TYPE_MASK = WindowInsetsCompat.Type.systemBars();

  public KeyboardState getState() {
    return mState;
  }

  public int getHeight() {
    return mHeight;
  }

  public void updateHeight(WindowInsetsCompat insets, boolean isNavigationBarTranslucent) {
    int contentBottomInset = insets.getInsets(CONTENT_TYPE_MASK).bottom;
    int systemBarBottomInset =
        isNavigationBarTranslucent ? 0 : insets.getInsets(SYSTEM_BAR_TYPE_MASK).bottom;
    int keyboardHeightDip = contentBottomInset - systemBarBottomInset;
    int keyboardHeight = (int) PixelUtil.toDIPFromPixel(Math.max(0, keyboardHeightDip));
    if (keyboardHeight <= 0 && mState == KeyboardState.OPEN) {
      /*
      When the keyboard is being canceling, for one frame the insets show a keyboard height of 0,
      causing a jump of the keyboard. We can avoid it by ignoring that frame and calling
      the listeners on the following frame.
      */
      return;
    }
    mHeight = keyboardHeight;
  }

  public void onAnimationStart() {
    if (mActiveTransitionCounter > 0) {
      mState = mState == KeyboardState.OPENING ? KeyboardState.CLOSING : KeyboardState.OPENING;
    } else {
      mState = mHeight <= 0 ? KeyboardState.OPENING : KeyboardState.CLOSING;
    }
    mActiveTransitionCounter++;
  }

  public void onAnimationEnd() {
    mActiveTransitionCounter--;
    if (mActiveTransitionCounter == 0) {
      mState = mHeight <= 0 ? KeyboardState.CLOSED : KeyboardState.OPEN;
    }
  }
}
