package com.swmansion.reanimated.nativeAnimations

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.view.View
import android.view.animation.LinearInterpolator
import java.lang.ref.WeakReference

internal data class TrackKey(
    val surfaceId: Int,
    val tag: Int,
    val owner: Int,
    val generation: Long,
    val target: Int,
) {
    fun toLongs(): LongArray = longArrayOf(surfaceId.toLong(), tag.toLong(), owner.toLong(), generation, target.toLong())

    companion object {
        fun listOf(values: LongArray): List<TrackKey> =
            values.asList().chunked(TrackEncoding.TRACK_KEY_LENGTH).map { (surfaceId, tag, owner, generation, target) ->
                TrackKey(surfaceId.toInt(), tag.toInt(), owner.toInt(), generation, target.toInt())
            }
    }
}

/** One track on its view. Its animator plays linearly, and the timeline gives the value at each frame. */
internal class TrackPlayback(
    val key: TrackKey,
    view: View,
    val writer: TrackWriter,
    val timeline: Timeline,
    val holdsEndValue: Boolean,
    startValue: DoubleArray,
    animatorDurationMs: Long,
    /** The fraction at which the track starts, or null for its start. */
    private val seekFraction: Float?,
    private val writesStartValue: Boolean,
    onEnd: (TrackPlayback) -> Unit,
) {
    val view = WeakReference(view)

    /** The components that the track shows now. The playback owns the array. */
    val value: DoubleArray = startValue.copyOf()

    /** The value reached the view at least once. */
    var hasApplied = false
        private set

    val animator: ValueAnimator =
        ValueAnimator.ofFloat(0f, 1f).apply {
            interpolator = LINEAR
            duration = animatorDurationMs
            addUpdateListener { showValueAt(it.animatedFraction) }
            addListener(
                object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: Animator) = onEnd(this@TrackPlayback)
                },
            )
        }

    fun start() {
        if (writesStartValue) apply()
        seekFraction?.let(animator::setCurrentFraction)
        animator.start()
    }

    fun reassert() {
        val shownView = view.get() ?: return
        if (!writer.shows(shownView, value)) apply()
    }

    private fun showValueAt(fraction: Float) {
        timeline.fill(fraction, value)
        apply()
    }

    private fun apply() {
        writer.apply(view.get() ?: return, value)
        hasApplied = true
    }

    private companion object {
        val LINEAR = LinearInterpolator()
    }
}
