package com.swmansion.worklets.runloop

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip

@Suppress("KotlinJniMissingFunction")
class AnimationFrameCallback @DoNotStrip private constructor(
    @field:DoNotStrip private val mHybridData: HybridData
) {
    external fun onAnimationFrame(timestampMs: Double)
}
