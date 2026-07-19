package com.swmansion.reanimated.nativeProxy

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class LayoutAnimationCallback(
    @field:DoNotStrip private val mHybridData: HybridData,
) {
    external fun onAnimationEnd(finished: Boolean)
}
