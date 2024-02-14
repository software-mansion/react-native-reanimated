package com.swmansion.reanimated.keyboard;

import androidx.core.view.WindowInsetsCompat;
import com.facebook.react.uimanager.PixelUtil;

public class Keyboard {
  private KeyboardState state;
  private int height = 0;
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
