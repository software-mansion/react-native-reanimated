package com.swmansion.reanimated.css

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.TimeInterpolator
import android.os.Handler
import android.os.Looper
import android.os.Message
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

    /**
     * Starts waiting for their View to mount, newest per key. A later start for the same
     * key replaces the earlier one, so a superseded request can never begin.
     */
    private val pendingStarts = LinkedHashMap<Key, PendingStart>()
    private var retryScheduled = false

    private val commandLock = Any()
    private var pendingCommands = ArrayList<Command>()
    private var spareCommands = ArrayList<Command>()
    private var flushScheduled = false
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Indexed by the easing id the C++ interner assigned; a define always precedes the
     * first animate call using its id. Copy-on-append keeps reads lock-free.
     */
    @Volatile
    private var easings = arrayOfNulls<TimeInterpolator>(0)

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

        /**
         * ObjectAnimator leaves its animated value uninitialised until its first frame, which
         * a start delay defers, so until then the property must show the start value.
         */
        fun currentValue(): Float = heldValue ?: if (animator.isRunning) animator.animatedValue as Float else startValue
    }

    private class PendingStart(
        val endTimestampMs: Double,
        val begin: () -> Boolean,
    )

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
        ) : Command()

        class Remove(
            override val key: Key,
        ) : Command()
    }

    /** Holds the start value for the leading [delayFraction], then plays [inner] over the rest. */
    private class HoldThenEase(
        private val delayFraction: Float,
        private val inner: TimeInterpolator,
    ) : TimeInterpolator {
        override fun getInterpolation(input: Float): Float =
            if (input <= delayFraction) 0f else inner.getInterpolation((input - delayFraction) / (1f - delayFraction))
    }

    /**
     * Whether the property is accepted for native playback. Playback can still fail later
     * if the View never mounts, and there is no path back to demote it.
     */
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
        val writer = cssPropertyWriterFor(propertyId) ?: return false
        val interpolator = easings.getOrNull(easingId) ?: return false
        val context = reactContext.get() ?: return false
        val scale = DurationScale.effectiveScale(context)
        if (scale <= 0f) return false

        enqueue(
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

    fun removeTransition(
        viewTag: Int,
        propertyId: Int,
    ) {
        enqueue(Command.Remove(Key(viewTag, propertyId)))
    }

    /**
     * One main-looper message per burst rather than one per transition: a commit can start
     * a transition on every view on screen, and a message each floods the looper. The
     * message is asynchronous so a traversal's sync barrier cannot defer it past the frame
     * whose committed value it is meant to replace.
     */
    private fun enqueue(command: Command) {
        val schedule: Boolean
        synchronized(commandLock) {
            pendingCommands.add(command)
            schedule = !flushScheduled
            if (schedule) flushScheduled = true
        }
        if (schedule) {
            val message = Message.obtain(mainHandler) { flushCommands() }
            message.isAsynchronous = true
            mainHandler.sendMessage(message)
        }
    }

    private fun flushCommands() {
        val batch: ArrayList<Command>
        synchronized(commandLock) {
            batch = pendingCommands
            pendingCommands = spareCommands
            flushScheduled = false
        }
        for (command in batch) {
            when (command) {
                is Command.Start -> beginStart(command)
                is Command.Remove -> {
                    pendingStarts.remove(command.key)
                    animators.remove(command.key)?.animator?.cancel()
                }
            }
        }
        batch.clear()
        spareCommands = batch
    }

    /**
     * A tag can be registered before its View mounts. The absolute start timestamp makes a
     * late start seek rather than drift, and retrying stops once the transition would have
     * ended, so it needs no timeout.
     */
    private fun beginStart(command: Command.Start) {
        val key = command.key
        val begin = {
            viewForTag(key.viewTag)?.also { view ->
                start(
                    view,
                    key,
                    command.writer,
                    command.fromValue,
                    command.toValue,
                    command.durationMs,
                    command.startTimestampMs,
                    command.interpolator,
                    command.scale,
                    command.persistent,
                )
            } != null
        }
        val endTimestampMs = command.startTimestampMs + command.durationMs
        if (begin() || animationTimestamp() >= endTimestampMs) {
            pendingStarts.remove(key)
            return
        }
        pendingStarts[key] = PendingStart(endTimestampMs, begin)
        scheduleRetry()
    }

    /** All waiting starts share one frame callback; one each floods the Choreographer. */
    private fun scheduleRetry() {
        if (retryScheduled) return
        retryScheduled = true
        Choreographer.getInstance().postFrameCallback {
            retryScheduled = false
            val now = animationTimestamp()
            val iterator = pendingStarts.entries.iterator()
            while (iterator.hasNext()) {
                val pending = iterator.next().value
                if (pending.begin() || now >= pending.endTimestampMs) iterator.remove()
            }
            if (pendingStarts.isNotEmpty()) scheduleRetry()
        }
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
        // Resume from what is on screen: fromValue is the committed style, so starting
        // there would snap back to where the cancelled transition began.
        val interrupted = animators.remove(key)
        val startValue = if (interrupted != null) writer.get(view) else fromValue.toFloat()
        interrupted?.animator?.cancel()

        // The target is already committed and ObjectAnimator writes nothing until its
        // first frame, so without this the view shows the target for the whole delay.
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
        // ObjectAnimator has no absolute start time; resolving it here rather than in C++
        // keeps the hop to this thread from shifting the timeline late.
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

    /** PathInterpolator flattens its curve natively on construction, so build once per id. */
    fun defineEasing(
        easingId: Int,
        easingType: Int,
        easingPointsX: FloatArray,
        easingPointsY: FloatArray,
    ) {
        val interpolator = CSSEasing.interpolator(easingType, easingPointsX, easingPointsY)
        val current = easings
        val grown = if (easingId < current.size) current.copyOf() else current.copyOf(easingId + 1)
        grown[easingId] = interpolator
        easings = grown
    }

    private fun viewForTag(viewTag: Int): View? =
        try {
            fabricUIManager.resolveView(viewTag)
        } catch (e: IllegalViewOperationException) {
            // Thrown, not null, when the tag is registered but the View does not exist yet.
            null
        }
}
