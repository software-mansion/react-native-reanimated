package com.swmansion.reanimated.nativeAnimations

import com.facebook.proguard.annotations.DoNotStrip

/** The `TargetSample` of the runtime-test hook. The C++ platform reads the fields. */
@DoNotStrip
internal class NativeAnimationSample(
    @JvmField @DoNotStrip val model: DoubleArray,
    @JvmField @DoNotStrip val presentation: DoubleArray,
    /** `TrackEncoding.TRACK_KEY_LENGTH` values for each track on the view. */
    @JvmField @DoNotStrip val playbacks: LongArray,
    /** One member for each timeline of the playback of the target, in the order in which the writer applies them. */
    @JvmField @DoNotStrip val members: Array<NativeAnimationMember>,
)

/** The `PlaybackMember` of the runtime-test hook. */
@DoNotStrip
internal class NativeAnimationMember(
    @JvmField @DoNotStrip val property: String,
    @JvmField @DoNotStrip val componentCount: Int,
    /** The components of the start value, then of the end value of each segment. */
    @JvmField @DoNotStrip val values: DoubleArray,
    @JvmField @DoNotStrip val keyTimes: DoubleArray,
)
