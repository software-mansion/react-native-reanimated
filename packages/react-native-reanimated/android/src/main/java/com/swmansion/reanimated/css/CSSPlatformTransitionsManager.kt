package com.swmansion.reanimated.css

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.TimeInterpolator
import android.util.FloatProperty
import android.view.Choreographer
import android.view.View
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import java.lang.ref.WeakReference

internal class CSSPlatformTransitionsManager(
    private val fabricUIManager: FabricUIManager,
    private val reactContext: WeakReference<ReactApplicationContext>,
    private val animationTimestamp: () -> Long,
) {
    private val animators = HashMap<Key, RunningTransition>()

    /**
     * React can overwrite an animated value only on frames where a mount ran, so the
     * pre-draw repair is skipped on all others. Everything here runs on the UI thread.
     */
    private var mountedSinceLastDraw = true

    init {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.addUIManagerEventListener(
            object : UIManagerListener {
                override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

                override fun willMountItems(uiManager: UIManager) = Unit

                override fun didMountItems(uiManager: UIManager) {
                    mountedSinceLastDraw = true
                }

                override fun didDispatchMountItems(uiManager: UIManager) = Unit

                override fun didScheduleMountItems(uiManager: UIManager) = Unit
            },
        )
    }

    private val reconciler = CSSPlatformTransitionReconciler(::repairClobberedValues)
    private val startTokens = HashMap<Key, Long>()

    /** Monotonic so a token is never reused, even after its entry is dropped. */
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
        /** Final value of a finished persistent transition, which outlives its animator. */
        var heldValue: Float? = null

        /**
         * ObjectAnimator leaves its animated value uninitialised until its first frame, which
         * a start delay defers, so until then the property must show the start value.
         */
        fun currentValue(): Float = heldValue ?: if (animator.isRunning) animator.animatedValue as Float else startValue
    }

    /** Holds the start value for the leading [delayFraction], then plays [inner] over the rest. */
    private class HoldThenEase(
        private val delayFraction: Float,
        private val inner: TimeInterpolator,
    ) : TimeInterpolator {
        override fun getInterpolation(input: Float): Float =
            if (input <= delayFraction) 0f else inner.getInterpolation((input - delayFraction) / (1f - delayFraction))
    }

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
        persistent: Boolean,
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
                    start(view, key, writer, fromValue, toValue, durationMs, startTimestampMs, interpolator, scale, persistent)
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
            animators.remove(key)?.animator?.cancel()
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
        writer: FloatProperty<View>,
        fromValue: Double,
        toValue: Double,
        durationMs: Double,
        startTimestampMs: Double,
        interpolator: TimeInterpolator,
        scale: Float,
        persistent: Boolean,
    ) {
        // On interruption resume from what is on screen: fromValue is the committed
        // style value, so starting there would snap the view back to where the
        // cancelled transition began.
        val interrupted = animators.remove(key)
        val startValue = if (interrupted != null) writer.get(view) else fromValue.toFloat()
        interrupted?.animator?.cancel()

        // React Native has already committed the target, and ObjectAnimator writes nothing
        // until its first frame - which transition-delay defers. Without this the view
        // would show the target for the whole delay and then jump back.
        writer.setValue(view, startValue)

        val animator = ObjectAnimator.ofFloat(view, writer, startValue, toValue.toFloat())
        animator.addListener(
            object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    // A replacement may already own the key.
                    val running = animators[key] ?: return
                    if (running.animator !== animation) return
                    // A persistent value has no committed style behind it, so dropping the entry
                    // would let the next commit revert the view.
                    if (persistent) {
                        running.heldValue = animator.animatedValue as Float
                    } else {
                        animators.remove(key)
                    }
                }
            },
        )
        // ObjectAnimator has no absolute start time, so resolve one against the clock
        // here rather than in C++: the hop to this thread and the wait for the next
        // frame would otherwise shift the whole timeline late.
        val elapsedMs = animationTimestamp().toDouble() - startTimestampMs
        val delayMs = if (elapsedMs < 0) -elapsedMs else 0.0
        // Play through the delay rather than using startDelay. A delayed ObjectAnimator
        // writes nothing while it waits, so any commit landing in that window stays on
        // screen; holding the start value inside the curve makes the animator rewrite the
        // property every frame instead. This is what kCAFillModeBackwards gives us on Apple.
        animator.duration = ((delayMs + durationMs) / scale).toLong().coerceAtLeast(1L)
        animator.interpolator =
            if (delayMs > 0) HoldThenEase((delayMs / (delayMs + durationMs)).toFloat(), interpolator) else interpolator
        if (elapsedMs > 0 && durationMs > 0) {
            // Seek before starting: ValueAnimator.start() gates on `mSeekFraction >= 0` when
            // deciding whether to begin immediately, so a later seek races the first frame.
            animator.setCurrentFraction((elapsedMs / durationMs).toFloat().coerceIn(0f, 1f))
        }
        animator.start()
        animators[key] = RunningTransition(animator, writer, startValue)
        reconciler.track(view)
    }

    /** Re-asserts each animator's own value wherever a commit overwrote it. */
    private fun repairClobberedValues(): Boolean {
        if (!mountedSinceLastDraw) return animators.isNotEmpty()
        mountedSinceLastDraw = false
        animators.values.forEach { running ->
            // target is held weakly, so read the View through it rather than keeping one.
            val view = running.animator.target as? View ?: return@forEach
            val current = running.currentValue()
            if (running.writer.get(view) != current) running.writer.setValue(view, current)
        }
        return animators.isNotEmpty()
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
