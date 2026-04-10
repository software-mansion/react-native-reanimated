package com.swmansion.reanimated.nativeProxy

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class PseudoSelectorCallback(
    @field:DoNotStrip private val mHybridData: HybridData,
) {
    external fun onSelectorStateChanged(isActive: Boolean)
}
