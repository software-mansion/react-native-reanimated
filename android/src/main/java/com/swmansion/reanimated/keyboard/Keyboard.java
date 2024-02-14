package com.swmansion.reanimated.keyboard;

import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.uimanager.PixelUtil;

public class Keyboard {
  private KeyboardState state;
  private int height = 0;
  private int activeTransitionCounter = 0;
  private final int contentTypeMask = WindowInsetsCompat.Type.ime();
  private final int systemBarTypeMask = WindowInsetsCompat.Type.systemBars();

  public KeyboardState getState() {
    return state;
  }

  public int getHeight() {
    return height;
  }

  public void updateHeight(WindowInsetsCompat insets) {
    int contentBottomInset = insets.getInsets(contentTypeMask).bottom;
    int systemBarBottomInset = insets.getInsets(systemBarTypeMask).bottom;
    boolean hasNavigationBar = KeyCharacterMap.deviceHasKey(KeyEvent.KEYCODE_HOME);
    int keyboardHeightDip =
        hasNavigationBar ? contentBottomInset - systemBarBottomInset : contentBottomInset;
    int keyboardHeight = (int) PixelUtil.toDIPFromPixel(Math.max(0, keyboardHeightDip));
    if (keyboardHeight == 0 && state == KeyboardState.OPEN) {
      return;
    }
    height = keyboardHeight;
  }

  public void onAnimationStart() {
    if (activeTransitionCounter > 0) {
      boolean isOpening = state == KeyboardState.OPENING;
      state = isOpening ? KeyboardState.CLOSING : KeyboardState.OPENING;
    } else {
      state = height == 0 ? KeyboardState.OPENING : KeyboardState.CLOSING;
    }
    activeTransitionCounter++;
  }

  public void onAnimationEnd() {
    activeTransitionCounter--;
    if (activeTransitionCounter == 0) {
      state = height == 0 ? KeyboardState.CLOSED : KeyboardState.OPEN;
    }
  }
}
