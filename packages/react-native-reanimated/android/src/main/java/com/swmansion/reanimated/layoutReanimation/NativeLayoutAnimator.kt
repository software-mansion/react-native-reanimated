package com.swmansion.reanimated.layoutReanimation

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.view.View
import android.view.animation.LinearInterpolator
import com.swmansion.reanimated.nativeProxy.LayoutAnimationCallback

/**
 * Plays a generic, pre-sampled layout-animation descriptor on a native Android
 * [View] using [ValueAnimator]. This is the Android counterpart of the iOS Core
 * Animation player: instead of driving the animation frame-by-frame from JS, we
 * receive a baked keyframe curve (easing and spring physics already sampled in)
 * and replay it on the platform animator.
 *
 * The descriptor is delivered as flattened primitive arrays (cheap to pass over
 * JNI): `keyPaths` is a newline-joined list of canonical channel names,
 * `keyframeCounts[i]` is the number of keyframes of channel `i`, and
 * `offsets`/`values` are the concatenated per-channel keyframe arrays.
 */
object NativeLayoutAnimator {
    private val runningAnimators = HashMap<Int, ValueAnimator>()

    private class Channel(val offsets: DoubleArray, val values: DoubleArray) {
        fun valueAt(fraction: Double): Double {
            if (values.isEmpty()) return 0.0
            if (fraction <= offsets.first()) return values.first()
            if (fraction >= offsets.last()) return values.last()
            for (i in 1 until offsets.size) {
                if (fraction <= offsets[i]) {
                    val span = offsets[i] - offsets[i - 1]
                    val t = if (span > 0) (fraction - offsets[i - 1]) / span else 0.0
                    return values[i - 1] + (values[i] - values[i - 1]) * t
                }
            }
            return values.last()
        }
    }

    fun run(
        view: View,
        tag: Int,
        durationMs: Double,
        @Suppress("UNUSED_PARAMETER") usePresentationLayer: Boolean,
        keyPaths: String,
        keyframeCounts: IntArray,
        offsets: DoubleArray,
        values: DoubleArray,
        callback: LayoutAnimationCallback,
    ) {
        // Cancelling a previous animation on the same view fires its
        // `onAnimationEnd(false)`, matching the "interrupted" semantics on iOS.
        runningAnimators.remove(tag)?.cancel()

        val channels = parseChannels(keyPaths, keyframeCounts, offsets, values)
        if (channels.isEmpty()) {
            callback.onAnimationEnd(true)
            return
        }

        val density = view.resources.displayMetrics.density
        val hasSize = channels.containsKey("width") || channels.containsKey("height")

        val animator = ValueAnimator.ofFloat(0f, 1f)
        animator.duration = if (durationMs > 0) durationMs.toLong() else 1L
        // Easing/spring are baked into the sampled curve, so drive it linearly.
        animator.interpolator = LinearInterpolator()

        animator.addUpdateListener { valueAnimator ->
            applyFrame(view, channels, hasSize, density, valueAnimator.animatedFraction.toDouble())
        }

        animator.addListener(
            object : AnimatorListenerAdapter() {
                private var cancelled = false

                override fun onAnimationCancel(animation: Animator) {
                    cancelled = true
                }

                override fun onAnimationEnd(animation: Animator) {
                    runningAnimators.remove(tag)
                    callback.onAnimationEnd(!cancelled)
                }
            },
        )

        runningAnimators[tag] = animator
        // Apply the first frame immediately to avoid a flash at the start state.
        applyFrame(view, channels, hasSize, density, 0.0)
        animator.start()
    }

    private fun parseChannels(
        keyPaths: String,
        keyframeCounts: IntArray,
        offsets: DoubleArray,
        values: DoubleArray,
    ): Map<String, Channel> {
        if (keyPaths.isEmpty()) return emptyMap()
        val names = keyPaths.split("\n")
        val channels = HashMap<String, Channel>(names.size)
        var cursor = 0
        for (i in names.indices) {
            val count = if (i < keyframeCounts.size) keyframeCounts[i] else 0
            if (count <= 0 || cursor + count > offsets.size) {
                continue
            }
            val channelOffsets = offsets.copyOfRange(cursor, cursor + count)
            val channelValues = values.copyOfRange(cursor, cursor + count)
            channels[names[i]] = Channel(channelOffsets, channelValues)
            cursor += count
        }
        return channels
    }

    private fun applyFrame(
        view: View,
        channels: Map<String, Channel>,
        hasSize: Boolean,
        density: Float,
        fraction: Double,
    ) {
        channels["opacity"]?.let { view.alpha = it.valueAt(fraction).toFloat() }

        // Translation: transform translate channels are relative offsets (in dp);
        // origin channels are absolute layout coordinates (in dp) which we turn
        // into an offset from the view's laid-out position so we never fight the
        // layout system.
        var translationX = 0.0
        var translationY = 0.0
        channels["translateX"]?.let { translationX += it.valueAt(fraction) * density }
        channels["translateY"]?.let { translationY += it.valueAt(fraction) * density }
        channels["originX"]?.let { translationX += it.valueAt(fraction) * density - view.left }
        channels["originY"]?.let { translationY += it.valueAt(fraction) * density - view.top }
        view.translationX = translationX.toFloat()
        view.translationY = translationY.toFloat()

        // Scale: transform scale channels, plus width/height approximated as a
        // scale from the top-left corner (Android Views can't be resized mid
        // animation without a relayout).
        var scaleX = channels["scaleX"]?.valueAt(fraction) ?: 1.0
        var scaleY = channels["scaleY"]?.valueAt(fraction) ?: 1.0
        if (hasSize) {
            view.pivotX = 0f
            view.pivotY = 0f
            channels["width"]?.let { if (view.width > 0) scaleX *= it.valueAt(fraction) * density / view.width }
            channels["height"]?.let { if (view.height > 0) scaleY *= it.valueAt(fraction) * density / view.height }
        }
        view.scaleX = scaleX.toFloat()
        view.scaleY = scaleY.toFloat()

        channels["rotation"]?.let { view.rotation = Math.toDegrees(it.valueAt(fraction)).toFloat() }
        channels["rotationX"]?.let { view.rotationX = Math.toDegrees(it.valueAt(fraction)).toFloat() }
        channels["rotationY"]?.let { view.rotationY = Math.toDegrees(it.valueAt(fraction)).toFloat() }
        // `perspective` maps to cameraDistance; `skewX` has no View equivalent and
        // is intentionally ignored (LightSpeed loses its shear on Android).
        channels["perspective"]?.let { view.cameraDistance = (it.valueAt(fraction) * density).toFloat() }
    }
}
