package com.swmansion.reanimated.nativeAnimations

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip

/** The calls of the executor into the C++ platform. UI thread only. */
@DoNotStrip
internal class NativeAnimationPlatformCallbacks(
    @field:DoNotStrip private val mHybridData: HybridData,
) {
    external fun onTrackEnded(
        surfaceId: Int,
        tag: Int,
        owner: Int,
        generation: Long,
        target: Int,
        finished: Boolean,
    )

    external fun drainPostedOperations()
}
