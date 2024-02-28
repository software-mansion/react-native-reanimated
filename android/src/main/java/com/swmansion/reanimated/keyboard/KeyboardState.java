package com.swmansion.reanimated.keyboard;

public enum KeyboardState {
  UNKNOWN(0),
  OPENING(1),
  OPEN(2),
  CLOSING(3),
  CLOSED(4);

  private final int mValue;

  KeyboardState(int value) {
    mValue = value;
  }

  public int asInt() {
    return mValue;
  }
}
