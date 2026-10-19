package com.swmansion.reanimated.nativeAnimations

import com.facebook.proguard.annotations.DoNotStrip

/** The `TargetSample` of the runtime-test hook. The C++ platform reads the fields. */
@DoNotStrip
internal class NativeAnimationSample(
    @JvmField @DoNotStrip val model: DoubleArray,
    @JvmField @DoNotStrip val presentation: DoubleArray,
    /** `TrackEncoding.TRACK_KEY_LENGTH` values for each track on the view. */
    @JvmField @DoNotStrip val playbacks: LongArray,
    @JvmField @DoNotStrip val memberProperty: String?,
    @JvmField @DoNotStrip val memberComponentCount: Int,
    /** The components of the start value, then of the end value of each segment. */
    @JvmField @DoNotStrip val memberValues: DoubleArray,
    @JvmField @DoNotStrip val memberKeyTimes: DoubleArray,
)
