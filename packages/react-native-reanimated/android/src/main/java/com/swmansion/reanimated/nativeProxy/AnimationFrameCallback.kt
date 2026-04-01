package com.swmansion.reanimated.nativeProxy

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.swmansion.reanimated.NodesManager

@DoNotStrip
class AnimationFrameCallback : NodesManager.OnAnimationFrame {

  @field:DoNotStrip private val mHybridData: HybridData

  @DoNotStrip
  private constructor(hybridData: HybridData) {
    mHybridData = hybridData
  }

  @DoNotStrip
  external override fun onAnimationFrame(timestampMs: Double)
}
