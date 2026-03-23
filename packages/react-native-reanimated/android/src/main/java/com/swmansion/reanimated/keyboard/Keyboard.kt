package com.swmansion.reanimated.keyboard

import androidx.core.view.WindowInsetsCompat
import com.facebook.react.uimanager.PixelUtil

class Keyboard {
  private var mState = KeyboardState.UNKNOWN
  private var mHeight = 0
  private var mActiveTransitionCounter = 0

  companion object {
    private val CONTENT_TYPE_MASK = WindowInsetsCompat.Type.ime()
    private val SYSTEM_BAR_TYPE_MASK = WindowInsetsCompat.Type.systemBars()
  }

  fun getState(): KeyboardState = mState

  fun getHeight(): Int = mHeight

  fun updateHeight(insets: WindowInsetsCompat, isNavigationBarTranslucent: Boolean) {
    val contentBottomInset = insets.getInsets(CONTENT_TYPE_MASK).bottom
    val systemBarBottomInset =
        if (isNavigationBarTranslucent) 0 else insets.getInsets(SYSTEM_BAR_TYPE_MASK).bottom
    val keyboardHeightDip = contentBottomInset - systemBarBottomInset
    val keyboardHeight = PixelUtil.toDIPFromPixel(Math.max(0, keyboardHeightDip).toFloat()).toInt()
    if (keyboardHeight <= 0 && mState == KeyboardState.OPEN) {
      /*
      When the keyboard is being canceling, for one frame the insets show a keyboard height of 0,
      causing a jump of the keyboard. We can avoid it by ignoring that frame and calling
      the listeners on the following frame.
      */
      return
    }
    mHeight = keyboardHeight
  }

  fun onAnimationStart() {
    if (mActiveTransitionCounter > 0) {
      mState = if (mState == KeyboardState.OPENING) KeyboardState.CLOSING else KeyboardState.OPENING
    } else {
      mState = if (mHeight <= 0) KeyboardState.OPENING else KeyboardState.CLOSING
    }
    mActiveTransitionCounter++
  }

  fun onAnimationEnd() {
    mActiveTransitionCounter--
    if (mActiveTransitionCounter == 0) {
      mState = if (mHeight <= 0) KeyboardState.CLOSED else KeyboardState.OPEN
    }
  }
}
