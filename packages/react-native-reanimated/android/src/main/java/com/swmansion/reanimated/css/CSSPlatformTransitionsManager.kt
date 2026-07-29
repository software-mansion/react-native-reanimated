package com.swmansion.reanimated.css

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.TimeInterpolator
import android.view.Choreographer
import android.view.View
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import java.lang.ref.WeakReference

internal class CSSPlatformTransitionsManager(
    private val fabricUIManager: FabricUIManager,
    private val reactContext: WeakReference<ReactApplicationContext>,
    private val animationTimestamp: () -> Long,
) {
    private val animators = HashMap<Key, ObjectAnimator>()
    private val interpolators = HashMap<InterpolatorKey, TimeInterpolator>()

    private data class Key(
        val viewTag: Int,
        val propertyName: String,
    )

    private data class InterpolatorKey(
        val type: Int,
        val pointsX: List<Float>,
        val pointsY: List<Float>,
    )

    fun animateTransition(
        viewTag: Int,
        propertyName: String,
        fromValue: Double,
        toValue: Double,
        durationMs: Double,
        startTimestampMs: Double,
        easingType: Int,
        easingPointsX: FloatArray,
        easingPointsY: FloatArray,
    ): Boolean {
        val writer = cssPropertyWriterFor(propertyName) ?: return false
        val context = reactContext.get() ?: return false
        val scale = DurationScale.effectiveScale(context)
        // Scale 0 means animations are off, and ValueAnimator would finish instantly.
        if (scale <= 0f) return false

        UiThreadUtil.runOnUiThread {
            val begin = {
                viewForTag(viewTag)?.also { view ->
                    val interpolator = interpolatorFor(easingType, easingPointsX, easingPointsY)
                    start(view, Key(viewTag, propertyName), writer, fromValue, toValue, durationMs, startTimestampMs, interpolator, scale)
                } != null
            }
            // A tag can be registered before its View exists, with the mount still in
            // flight. The start timestamp is absolute, so waiting a frame costs nothing:
            // the elapsed offset absorbs it.
            if (!begin()) Choreographer.getInstance().postFrameCallback { begin() }
        }
        return true
    }

    fun removeTransition(
        viewTag: Int,
        propertyName: String,
    ) {
        UiThreadUtil.runOnUiThread { animators.remove(Key(viewTag, propertyName))?.cancel() }
    }

    private fun start(
        view: View,
        key: Key,
        writer: android.util.FloatProperty<View>,
        fromValue: Double,
        toValue: Double,
        durationMs: Double,
        startTimestampMs: Double,
        interpolator: TimeInterpolator,
        scale: Float,
    ) {
        // On interruption resume from what is on screen: fromValue is the committed
        // style value, so starting there would snap the view back to where the
        // cancelled transition began.
        val interrupted = animators.remove(key)
        val startValue = if (interrupted != null) writer.get(view) else fromValue.toFloat()
        interrupted?.cancel()

        val animator = ObjectAnimator.ofFloat(view, writer, startValue, toValue.toFloat())
        animator.interpolator = interpolator
        animator.duration = (durationMs / scale).toLong().coerceAtLeast(1L)
        animator.addListener(
            object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    // A replacement may already own the key.
                    if (animators[key] === animation) animators.remove(key)
                }
            },
        )
        // ObjectAnimator has no absolute start time, so resolve one against the clock
        // here rather than in C++: the hop to this thread and the wait for the next
        // frame would otherwise shift the whole timeline late.
        val elapsedMs = animationTimestamp().toDouble() - startTimestampMs
        if (elapsedMs < 0) animator.startDelay = (-elapsedMs / scale).toLong()
        animator.start()
        animators[key] = animator
        if (elapsedMs > 0 && durationMs > 0) {
            animator.setCurrentFraction((elapsedMs / durationMs).toFloat().coerceIn(0f, 1f))
        }
    }

    /**
     * PathInterpolator flattens its curve natively on construction, so cache it. The
     * type is part of the key because different families can share a point list:
     * linear(0.5, 1) and cubicBezier(0, 1, 0.5, 1) both normalize to [0,1],[0.5,1].
     */
    private fun interpolatorFor(
        type: Int,
        pointsX: FloatArray,
        pointsY: FloatArray,
    ): TimeInterpolator {
        val key = InterpolatorKey(type, pointsX.toList(), pointsY.toList())
        return interpolators.getOrPut(key) { CSSEasing.interpolator(type, pointsX, pointsY) }
    }

    private fun viewForTag(viewTag: Int): View? =
        try {
            fabricUIManager.resolveView(viewTag)
        } catch (e: IllegalViewOperationException) {
            // Thrown, not null, when the tag is registered but the View does not exist yet.
            null
        }
}
