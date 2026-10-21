package com.swmansion.reanimated.nativeAnimations

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.view.View
import android.view.animation.AnimationUtils
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

/** The animator of a track plays [animatedMs] of Reanimated's clock from [startTimestampMs]. */
internal class AnimatorAlignment(
    private val startTimestampMs: Double,
    private val animatedMs: Double,
    private val animationTimestampOf: (Long) -> Long,
) {
    fun fractionAt(timestampMs: Double): Float = ((timestampMs - startTimestampMs) / animatedMs).toFloat().coerceIn(0f, 1f)

    fun fractionAtAnimationTime(animationTimeMs: Long): Float = fractionAt(animationTimestampOf(animationTimeMs).toDouble())
}

/** One track on its view. Its animator plays linearly, and the timeline gives the value at each frame. */
internal class TrackPlayback(
    val key: TrackKey,
    view: View,
    val binding: TrackBinding,
    val timeline: Timeline,
    val holdsEndValue: Boolean,
    /** The track ends at the model of the view (`MountedModelMustMatchEndpoint`). */
    private val endsAtModel: Boolean,
    startValue: DoubleArray,
    animatorDurationMs: Long,
    /** The fraction at which the track starts, or null for its start. */
    private val seekFraction: Float?,
    private val writesStartValue: Boolean,
    /** Puts the animator start on the track timeline at the first animator frame, or null for a track of no time. */
    private val alignment: AnimatorAlignment?,
    onEnd: (TrackPlayback) -> Unit,
) {
    val view = WeakReference(view)

    /** The components that the track shows now. The playback owns the array. */
    val value: DoubleArray = startValue.copyOf()

    /** The value reached the view at least once. */
    var hasApplied = false
        private set

    /**
     * False from the update of fraction 1 of a track that ends at the model: the other writers of the view own
     * the property then, and the pre-draw repair leaves it.
     */
    var ownsProperty = true
        private set

    /** Not null from the return of `animator.start()` until the first animator frame. */
    private var pendingAlignment: AnimatorAlignment? = null

    val animator: ValueAnimator =
        ValueAnimator.ofFloat(0f, 1f).apply {
            interpolator = LINEAR
            duration = animatorDurationMs
            addUpdateListener(::onAnimatorUpdate)
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
        pendingAlignment = alignment
    }

    fun reassert() {
        if (!ownsProperty) return
        val shownView = view.get() ?: return
        if (!binding.shows(shownView, value)) apply()
    }

    private fun onAnimatorUpdate(animation: ValueAnimator) {
        val firstFrameAlignment = pendingAlignment
        if (firstFrameAlignment == null) {
            showValueAt(animation.animatedFraction)
            return
        }
        pendingAlignment = null
        val frameTimeMs = AnimationUtils.currentAnimationTimeMillis()
        animation.setCurrentFraction(firstFrameAlignment.fractionAtAnimationTime(frameTimeMs))
    }

    private fun showValueAt(fraction: Float) {
        if (!ownsProperty) return
        timeline.fill(fraction, value)
        if (endsAtModel && fraction >= 1f) {
            ownsProperty = false
            view.get()?.let { binding.showModel(it, value) }
        } else {
            apply()
        }
    }

    private fun apply() {
        binding.apply(view.get() ?: return, value)
        hasApplied = true
    }

    private companion object {
        val LINEAR = LinearInterpolator()
    }
}
