package com.swmansion.reanimated.keyboard;

import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.uimanager.PixelUtil;

public class Keyboard {
  private KeyboardState state;
  private int height = 0;
  private static final int CONTENT_TYPE_MASK = WindowInsetsCompat.Type.ime();
  private static final int SYSTEM_BAR_TYPE_MASK = WindowInsetsCompat.Type.systemBars();

  public KeyboardState getState() {
    return state;
  }

  public int getHeight() {
    return height;
  }

  public void updateHeight(WindowInsetsCompat insets) {
    int contentBottomInset = insets.getInsets(CONTENT_TYPE_MASK).bottom;
    int systemBarBottomInset = insets.getInsets(SYSTEM_BAR_TYPE_MASK).bottom;
    int keyboardHeightDip = contentBottomInset - systemBarBottomInset;
    height = (int) PixelUtil.toDIPFromPixel(Math.max(0, keyboardHeightDip));
  }

  public void onAnimationStart() {
    state = height == 0 ? KeyboardState.OPENING : KeyboardState.CLOSING;
  }

  public void onAnimationEnd() {
    state = height == 0 ? KeyboardState.CLOSED : KeyboardState.OPEN;
  }
}
