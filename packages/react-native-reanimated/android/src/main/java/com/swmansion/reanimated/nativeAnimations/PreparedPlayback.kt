package com.swmansion.reanimated.nativeAnimations

import com.facebook.proguard.annotations.DoNotStrip

/** The result of `NativeAnimationExecutor.prepare`. */
internal sealed interface Preparation

@DoNotStrip
internal class PreparationRejection(
    @JvmField @DoNotStrip val reason: Int,
) : Preparation

/** Tracks with all fallible work done, so [install] cannot fail. A playback that is never installed has no effect. */
@DoNotStrip
internal class PreparedPlayback(
    private val executor: NativeAnimationExecutor,
    private val tracks: List<TrackPlayback>,
) : Preparation {
    @DoNotStrip
    fun install(replacedTracks: LongArray) = executor.install(TrackKey.listOf(replacedTracks), tracks)
}
