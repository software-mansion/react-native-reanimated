package com.swmansion.reanimated.keyboard

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class KeyboardWorkletWrapper {
  @field:DoNotStrip private val mHybridData: HybridData

  @DoNotStrip
  private constructor(hybridData: HybridData) {
    mHybridData = hybridData
  }

  external fun invoke(keyboardState: Int, height: Int)
}
