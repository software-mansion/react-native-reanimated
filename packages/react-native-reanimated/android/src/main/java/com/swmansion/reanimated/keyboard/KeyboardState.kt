package com.swmansion.reanimated.keyboard

enum class KeyboardState(private val mValue: Int) {
  UNKNOWN(0),
  OPENING(1),
  OPEN(2),
  CLOSING(3),
  CLOSED(4);

  fun asInt(): Int = mValue
}
