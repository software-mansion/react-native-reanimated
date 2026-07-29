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
    private val startTokens = HashMap<Key, Long>()

    /** Monotonic so a token is never reused, even after its entry is dropped. */
    private var nextStartToken = 0L
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

    /**
     * Returns whether the property is accepted for native playback, decided before the
     * hop to the UI thread. Playback itself can still fail there if the View never
     * mounts, and there is no path back to demote the property afterwards - the same
     * contract the Apple backend has.
     */
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
            val key = Key(viewTag, propertyName)
            // Claiming a fresh token invalidates any retry still queued for this key,
            // so a superseded request cannot start on a later frame.
            val token = ++nextStartToken
            startTokens[key] = token

            beginWhenMounted(key, token, startTimestampMs + durationMs) {
                viewForTag(viewTag)?.also { view ->
                    val interpolator = interpolatorFor(easingType, easingPointsX, easingPointsY)
                    start(view, key, writer, fromValue, toValue, durationMs, startTimestampMs, interpolator, scale)
                } != null
            }
        }
        return true
    }

    fun removeTransition(
        viewTag: Int,
        propertyName: String,
    ) {
        UiThreadUtil.runOnUiThread {
            val key = Key(viewTag, propertyName)
            // Also drops any queued retry for this key.
            startTokens.remove(key)
            animators.remove(key)?.cancel()
        }
    }

    /**
     * A tag can be registered before its View exists, with the mount still in flight.
     * The start timestamp is absolute, so a late start seeks rather than drifting, and
     * retrying needs no arbitrary timeout: once the transition would have ended there
     * is nothing left to play.
     */
    private fun beginWhenMounted(
        key: Key,
        token: Long,
        endTimestampMs: Double,
        begin: () -> Boolean,
    ) {
        if (startTokens[key] != token) return
        if (begin() || animationTimestamp() >= endTimestampMs) {
            startTokens.remove(key)
            return
        }
        Choreographer.getInstance().postFrameCallback { beginWhenMounted(key, token, endTimestampMs, begin) }
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
