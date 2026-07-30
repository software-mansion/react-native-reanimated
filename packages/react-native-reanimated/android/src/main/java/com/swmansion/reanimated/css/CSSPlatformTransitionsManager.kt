package com.swmansion.reanimated.css

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.TimeInterpolator
import android.util.FloatProperty
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
    private val animators = HashMap<Key, RunningTransition>()
    private val reconciler = CSSPlatformTransitionReconciler(::repairClobberedValues)
    private val startTokens = HashMap<Key, Long>()

    private var nextStartToken = 0L
    private val interpolators = HashMap<InterpolatorKey, TimeInterpolator>()

    private data class Key(
        val viewTag: Int,
        val propertyName: String,
    )

    private class RunningTransition(
        val animator: ObjectAnimator,
        val writer: FloatProperty<View>,
        val startValue: Float,
    ) {
        /**
         * ObjectAnimator leaves its animated value uninitialised until its first frame, which
         * a start delay defers, so until then the property must show the start value.
         */
        fun currentValue(): Float = if (animator.isRunning) animator.animatedValue as Float else startValue
    }

    private data class InterpolatorKey(
        val type: Int,
        val pointsX: List<Float>,
        val pointsY: List<Float>,
    )

    /** Whether the property is accepted; it can still fail later if the View never mounts. */
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
        if (scale <= 0f) return false

        UiThreadUtil.runOnUiThread {
            val key = Key(viewTag, propertyName)
            // A fresh token invalidates any retry still queued for this key.
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
            startTokens.remove(key)
            animators.remove(key)?.animator?.cancel()
        }
    }

    /**
     * A tag can be registered before its View mounts. The start timestamp is absolute, so a
     * late start seeks rather than drifts, and retries stop once the transition would have ended.
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
        writer: FloatProperty<View>,
        fromValue: Double,
        toValue: Double,
        durationMs: Double,
        startTimestampMs: Double,
        interpolator: TimeInterpolator,
        scale: Float,
    ) {
        // Resume from what is on screen; fromValue is the committed style, which would snap back.
        val interrupted = animators.remove(key)
        val startValue = if (interrupted != null) writer.get(view) else fromValue.toFloat()
        interrupted?.animator?.cancel()

        // ObjectAnimator writes nothing until its first frame, so the view would show the
        // already-committed target for the whole delay.
        writer.setValue(view, startValue)

        val animator = ObjectAnimator.ofFloat(view, writer, startValue, toValue.toFloat())
        animator.interpolator = interpolator
        animator.duration = (durationMs / scale).toLong().coerceAtLeast(1L)
        animator.addListener(
            object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    if (animators[key]?.animator === animation) animators.remove(key)
                }
            },
        )
        // ObjectAnimator has no absolute start time, so resolve it after the thread hop
        // rather than in C++, which would shift the timeline late.
        val elapsedMs = animationTimestamp().toDouble() - startTimestampMs
        if (elapsedMs < 0) animator.startDelay = (-elapsedMs / scale).toLong()
        if (elapsedMs > 0 && durationMs > 0) {
            // Seek first: start() gates on `mSeekFraction >= 0`, so a later seek races frame one.
            animator.setCurrentFraction((elapsedMs / durationMs).toFloat().coerceIn(0f, 1f))
        }
        animator.start()
        animators[key] = RunningTransition(animator, writer, startValue)
        reconciler.track(view)
    }

    /** Re-asserts each animator's own value wherever a commit overwrote it. */
    private fun repairClobberedValues(): Boolean {
        animators.values.forEach { running ->
            // target is held weakly, so read the View through it rather than keeping one.
            val view = running.animator.target as? View ?: return@forEach
            val current = running.currentValue()
            if (running.writer.get(view) != current) running.writer.setValue(view, current)
        }
        return animators.isNotEmpty()
    }

    /** PathInterpolator flattens its curve on construction, so cache it. Type is in the key
     * because families share point lists. */
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
