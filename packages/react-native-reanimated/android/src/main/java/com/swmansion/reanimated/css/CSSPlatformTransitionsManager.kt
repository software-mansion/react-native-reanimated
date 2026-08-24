package com.swmansion.reanimated.css

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.TimeInterpolator
import android.os.Handler
import android.os.Looper
import android.util.FloatProperty
import android.view.Choreographer
import android.view.View
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
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

    private val reconciler = CSSPlatformTransitionReconciler(::onPreDraw)

    @Volatile
    private var invalidated = false

    /** Starts waiting for their View to mount, newest per key so a superseded start never begins. */
    private val pendingStarts = LinkedHashMap<Key, Command.Start>()
    private var retryScheduled = false

    private val commands = MainThreadCommandQueue<Command>(::executeCommand)
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * A C++ mutex serialises the callers but is not a happens-before edge for Java, so the
     * map supplies that ordering itself.
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

    private sealed class Command {
        abstract val key: Key

        class Start(
            override val key: Key,
            val writer: FloatProperty<View>,
            val fromValue: Double,
            val toValue: Double,
            val durationMs: Double,
            val startTimestampMs: Double,
            val interpolator: TimeInterpolator,
            val scale: Float,
            val persistent: Boolean,
        ) : Command() {
            val endTimestampMs: Double get() = startTimestampMs + durationMs
        }

        class Remove(
            override val key: Key,
        ) : Command()
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

        commands.enqueue(
            Command.Start(
                Key(viewTag, propertyId),
                writer,
                fromValue,
                toValue,
                durationMs,
                startTimestampMs,
                interpolator,
                scale,
                persistent,
            ),
        )
        return true
    }

    /** Animators keep ticking on their own, so a dead context has to stop them. */
    fun invalidate() {
        // Set before posting: a start already queued would otherwise register a new
        // animator and listener behind the cleanup.
        invalidated = true
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.removeUIManagerEventListener(mountListener)
        mainHandler.post {
            pendingStarts.clear()
            // Snapshot first: cancel() runs onAnimationEnd, which reads the map.
            val running = animators.values.toList()
            animators.clear()
            running.forEach { it.animator.cancel() }
            reconciler.invalidate()
            easings.clear()
        }
    }

    fun removeTransition(
        viewTag: Int,
        propertyId: Int,
    ) {
        // Teardown streams a removal per routed property, and each would post its own message.
        if (invalidated) return
        commands.enqueue(Command.Remove(Key(viewTag, propertyId)))
    }

    private fun executeCommand(command: Command) {
        // A start must not register an animator behind cleanup that is already posted.
        if (invalidated) return
        when (command) {
            is Command.Start -> beginStart(command)
            is Command.Remove -> removeNow(command.key)
        }
    }

    private fun removeNow(key: Key) {
        pendingStarts.remove(key)
        animators.remove(key)?.animator?.cancel()
    }

    /**
     * A tag can be registered before its View mounts. The absolute start timestamp makes a
     * late start seek rather than drift, and retrying stops once the transition would have
     * ended, so it needs no timeout.
     */
    private fun beginStart(command: Command.Start) {
        if (startIfMounted(command) || animationTimestamp() >= command.endTimestampMs) {
            pendingStarts.remove(command.key)
            return
        }
        pendingStarts[command.key] = command
        scheduleRetry()
    }

    /** False while the View is still unmounted, which leaves the start pending. */
    private fun startIfMounted(command: Command.Start): Boolean {
        val view = viewForTag(command.key.viewTag) ?: return false
        start(view, command)
        return true
    }

    /** All waiting starts share one frame callback; one each floods the Choreographer. */
    private fun scheduleRetry() {
        if (retryScheduled) return
        retryScheduled = true
        Choreographer.getInstance().postFrameCallback {
            retryScheduled = false
            if (invalidated) {
                pendingStarts.clear()
                return@postFrameCallback
            }
            val now = animationTimestamp()
            val iterator = pendingStarts.entries.iterator()
            while (iterator.hasNext()) {
                val pending = iterator.next().value
                if (startIfMounted(pending) || now >= pending.endTimestampMs) iterator.remove()
            }
            if (pendingStarts.isNotEmpty()) scheduleRetry()
        }
    }

    private fun start(
        view: View,
        command: Command.Start,
    ) {
        val key = command.key
        val writer = command.writer
        val durationMs = command.durationMs
        val interpolator = command.interpolator

        // Resume from what is on screen; fromValue is the committed style, which would snap back.
        val interrupted = animators.remove(key)
        val startValue = if (interrupted != null) writer.get(view) else command.fromValue.toFloat()
        interrupted?.animator?.cancel()

        // ObjectAnimator has no absolute start time, so resolve it after the thread hop
        // rather than in C++, which would shift the timeline late.
        val elapsedMs = animationTimestamp().toDouble() - command.startTimestampMs

        // ObjectAnimator writes nothing until its first frame, so the view would show the
        // already-committed target for the whole delay. A start that is already past its end
        // has no delay left to cover, so priming it would only be a wasted write.
        if (elapsedMs < durationMs) writer.setValue(view, startValue)

        val animator = ObjectAnimator.ofFloat(view, writer, startValue, command.toValue.toFloat())
        animator.addListener(
            object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    val running = animators[key] ?: return
                    if (running.animator !== animation) return
                    // A persistent value has no committed style behind it, so dropping the entry
                    // would let the next commit revert the view.
                    if (command.persistent) {
                        running.heldValue = animator.animatedValue as Float
                    } else {
                        animators.remove(key)
                    }
                }
            },
        )
        val delayMs = if (elapsedMs < 0) -elapsedMs else 0.0
        // startDelay writes nothing while it waits, so a commit landing in the delay would
        // stay on screen. Folding the delay into the curve rewrites the property instead.
        animator.duration = ((delayMs + durationMs) / command.scale).toLong().coerceAtLeast(1L)
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

    /**
     * Draining here as well as from the posted message puts a queued start after the commit
     * that wrote the target and before the draw, so it replaces the target in the same frame
     * rather than showing it once. Returns whether the listener is still needed.
     */
    private fun onPreDraw(): Boolean {
        commands.drain()
        repairClobberedValues()
        // Retiring while idle leaves the next start with only its posted message to beat the
        // draw that React's commit triggers, and losing that race shows the committed target
        // for a frame. Both calls above are no-ops while nothing is queued or running.
        return !invalidated
    }

    /** Re-asserts each animator's own value wherever a commit overwrote it. */
    private fun repairClobberedValues() {
        if (!reactWroteSinceLastDraw) return
        reactWroteSinceLastDraw = false
        animators.values.forEach { running ->
            // target is held weakly, so read the View through it rather than keeping one.
            val view = running.animator.target as? View ?: return@forEach
            val current = running.currentValue()
            if (running.writer.get(view) != current) running.writer.setValue(view, current)
        }
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

    fun undefineEasing(easingId: Int) {
        easings.remove(easingId)
    }

    private fun viewForTag(viewTag: Int): View? =
        try {
            fabricUIManager.resolveView(viewTag)
        } catch (e: IllegalViewOperationException) {
            // Thrown, not null, when the tag is registered but the View does not exist yet.
            null
        }
}
