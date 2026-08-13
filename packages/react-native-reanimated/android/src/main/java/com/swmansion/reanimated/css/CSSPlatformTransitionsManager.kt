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
import java.util.concurrent.ConcurrentHashMap

internal class CSSPlatformTransitionsManager(
    private val fabricUIManager: FabricUIManager,
    private val reactContext: WeakReference<ReactApplicationContext>,
    private val animationTimestamp: () -> Long,
) {
    private val animators = HashMap<Key, RunningTransition>()

    /**
     * React can overwrite an animated value only on frames where it wrote props, so the
     * pre-draw repair is skipped on all others. Everything here runs on the UI thread.
     */
    private var reactWroteSinceLastDraw = true

    @OptIn(UnstableReactNativeAPI::class)
    private val mountListener =
        object : UIManagerListener {
            override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

            override fun willMountItems(uiManager: UIManager) = Unit

            override fun didMountItems(uiManager: UIManager) {
                reactWroteSinceLastDraw = true
            }

            override fun didDispatchMountItems(uiManager: UIManager) = Unit

            override fun didScheduleMountItems(uiManager: UIManager) = Unit
        }

    init {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.addUIManagerEventListener(mountListener)
    }

    private val reconciler = CSSPlatformTransitionReconciler(::repairClobberedValues)
    private val startTokens = HashMap<Key, Long>()

    @Volatile
    private var invalidated = false

    private var nextStartToken = 0L

    /**
     * Keyed by the easing id the C++ interner assigned; a define always precedes the first
     * animate call using its id. The C++ side serialises its callers on a mutex, which is not
     * a happens-before edge for Java, so the map supplies that ordering itself.
     */
    private val easings = ConcurrentHashMap<Int, TimeInterpolator>()

    private data class Key(
        val viewTag: Int,
        val propertyId: Int,
    )

    private class RunningTransition(
        val animator: ObjectAnimator,
        val writer: FloatProperty<View>,
        val startValue: Float,
    ) {
        /** Final value of a finished persistent transition, which outlives its animator. */
        var heldValue: Float? = null

        /** Uninitialised until the first frame, which a start delay defers, so show startValue. */
        fun currentValue(): Float = heldValue ?: if (animator.isRunning) animator.animatedValue as Float else startValue
    }

    /** Holds the start value for [delayFraction], then plays [inner] over the rest. */
    private class HoldThenEase(
        private val delayFraction: Float,
        private val inner: TimeInterpolator,
    ) : TimeInterpolator {
        override fun getInterpolation(input: Float): Float {
            if (input < delayFraction) return 0f
            // A zero duration is all delay, so the target only lands on the final frame.
            if (delayFraction >= 1f) return 1f
            // Not `<=` above: at the boundary a jump-start step already owes its first step.
            return inner.getInterpolation((input - delayFraction) / (1f - delayFraction))
        }
    }

    /** Whether the property is accepted; it can still fail later if the View never mounts. */
    fun animateTransition(
        viewTag: Int,
        propertyId: Int,
        fromValue: Double,
        toValue: Double,
        durationMs: Double,
        startTimestampMs: Double,
        easingId: Int,
        persistent: Boolean,
    ): Boolean {
        if (invalidated) return false
        val writer = cssPropertyWriterFor(propertyId) ?: return false
        val interpolator = easings[easingId] ?: return false
        val context = reactContext.get() ?: return false
        val scale = DurationScale.effectiveScale(context)
        if (scale <= 0f) return false

        UiThreadUtil.runOnUiThread {
            if (invalidated) return@runOnUiThread
            val key = Key(viewTag, propertyId)
            // A fresh token invalidates any retry still queued for this key.
            val token = ++nextStartToken
            startTokens[key] = token

            beginWhenMounted(key, token, startTimestampMs + durationMs) {
                viewForTag(viewTag)?.also { view ->
                    start(view, key, writer, fromValue, toValue, durationMs, startTimestampMs, interpolator, scale, persistent)
                } != null
            }
        }
        return true
    }

    /** Animators keep ticking on their own, so a dead context has to stop them. */
    fun invalidate() {
        // Set before posting: a start already queued would otherwise register a new
        // animator and listener behind the cleanup.
        invalidated = true
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.removeUIManagerEventListener(mountListener)
        UiThreadUtil.runOnUiThread {
            startTokens.clear()
            // Snapshot first: cancel() runs onAnimationEnd, which reads the map.
            val running = animators.values.toList()
            animators.clear()
            running.forEach { it.animator.cancel() }
            reconciler.invalidate()
            // Interpolators outlive every animation that used them, so a flattened curve per
            // easing would otherwise sit here until the manager itself is collected.
            easings.clear()
        }
    }

    fun removeTransition(
        viewTag: Int,
        propertyId: Int,
    ) {
        UiThreadUtil.runOnUiThread {
            val key = Key(viewTag, propertyId)
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
        persistent: Boolean,
    ) {
        // Resume from what is on screen; fromValue is the committed style, which would snap back.
        val interrupted = animators.remove(key)
        val startValue = if (interrupted != null) writer.get(view) else fromValue.toFloat()
        interrupted?.animator?.cancel()

        // ObjectAnimator writes nothing until its first frame, so the view would show the
        // already-committed target for the whole delay.
        writer.setValue(view, startValue)

        val animator = ObjectAnimator.ofFloat(view, writer, startValue, toValue.toFloat())
        animator.addListener(
            object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
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
        // ObjectAnimator has no absolute start time, so resolve it after the thread hop
        // rather than in C++, which would shift the timeline late.
        val elapsedMs = animationTimestamp().toDouble() - startTimestampMs
        val delayMs = if (elapsedMs < 0) -elapsedMs else 0.0
        // startDelay writes nothing while it waits, so a commit landing in the delay would
        // stay on screen. Folding the delay into the curve rewrites the property instead.
        animator.duration = ((delayMs + durationMs) / scale).toLong().coerceAtLeast(1L)
        animator.interpolator =
            if (delayMs > 0) HoldThenEase((delayMs / (delayMs + durationMs)).toFloat(), interpolator) else interpolator
        if (elapsedMs > 0 && durationMs > 0) {
            // Seek first: start() gates on `mSeekFraction >= 0`, so a later seek races frame one.
            animator.setCurrentFraction((elapsedMs / durationMs).toFloat().coerceIn(0f, 1f))
        }
        animator.start()
        animators[key] = RunningTransition(animator, writer, startValue)
        reconciler.track(view)
    }

    /** Synchronous prop writes run their mount item inline, so no listener reports them. */
    fun onPropsWrittenSynchronously() {
        reactWroteSinceLastDraw = true
    }

    /** Re-asserts each animator's own value wherever a commit overwrote it. */
    private fun repairClobberedValues(): Boolean {
        if (!reactWroteSinceLastDraw) return animators.isNotEmpty()
        reactWroteSinceLastDraw = false
        animators.values.forEach { running ->
            // target is held weakly, so read the View through it rather than keeping one.
            val view = running.animator.target as? View ?: return@forEach
            val current = running.currentValue()
            if (running.writer.get(view) != current) running.writer.setValue(view, current)
        }
        return animators.isNotEmpty()
    }

    /** PathInterpolator flattens its curve natively on construction, so build once per id. */
    fun defineEasing(
        easingId: Int,
        easingType: Int,
        easingPointsX: FloatArray,
        easingPointsY: FloatArray,
    ) {
        easings[easingId] = CSSEasing.interpolator(easingType, easingPointsX, easingPointsY)
    }

    private fun viewForTag(viewTag: Int): View? =
        try {
            fabricUIManager.resolveView(viewTag)
        } catch (e: IllegalViewOperationException) {
            // Thrown, not null, when the tag is registered but the View does not exist yet.
            null
        }
}
