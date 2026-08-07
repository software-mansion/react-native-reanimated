package com.swmansion.reanimated.css

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
    private val transitions = HashMap<Key, RunningTransition>()

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

    /**
     * Indexed by the easing id the C++ interner assigned; a define always precedes the
     * first animate call using its id. Copy-on-append keeps reads lock-free.
     */
    @Volatile
    private var easings = arrayOfNulls<TimeInterpolator>(0)

    private var pumping = false

    private val commandLock = Any()
    private var pendingCommands = ArrayList<Command>()
    private var spareCommands = ArrayList<Command>()
    private var flushScheduled = false
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Single per-frame driver for every running transition. Values come from the absolute
     * start timestamp, so delay (t < 0) and late starts need no extra state.
     */
    private val framePump =
        object : Choreographer.FrameCallback {
            override fun doFrame(frameTimeNanos: Long) {
                val now = animationTimestamp().toDouble()
                var active = false
                val iterator = transitions.entries.iterator()
                while (iterator.hasNext()) {
                    val running = iterator.next().value
                    val view = running.viewRef.get()
                    if (view == null) {
                        iterator.remove()
                        continue
                    }
                    if (running.finished) continue
                    val elapsedMs = now - running.startTimeMs
                    if (elapsedMs < 0) {
                        // Delay phase: hold the raw start value; step easings are already nonzero at t = 0.
                        running.current = running.startValue
                        running.writer.setValue(view, running.startValue)
                        active = true
                        continue
                    }
                    val progress = (elapsedMs / running.durationMs).toFloat().coerceAtMost(1f)
                    val value =
                        running.startValue +
                            (running.toValue - running.startValue) * running.interpolator.getInterpolation(progress)
                    running.current = value
                    // setAlpha early-outs on unchanged values, so unconditional writes cost nothing.
                    running.writer.setValue(view, value)
                    if (elapsedMs < running.durationMs) {
                        active = true
                        continue
                    }
                    if (running.persistent) {
                        // Keeps its entry so the pre-draw repair defends the final value.
                        running.finished = true
                    } else {
                        iterator.remove()
                    }
                }
                if (active) {
                    Choreographer.getInstance().postFrameCallback(this)
                } else {
                    pumping = false
                }
            }
        }

    private data class Key(
        val viewTag: Int,
        val propertyId: Int,
    )

    private class RunningTransition(
        view: View,
        val writer: FloatProperty<View>,
        val startValue: Float,
        val toValue: Float,
        val startTimeMs: Double,
        val durationMs: Double,
        val interpolator: TimeInterpolator,
        val persistent: Boolean,
    ) {
        val viewRef = WeakReference(view)

        /** Last value this manager wrote; the repair pass re-asserts it after commits. */
        var current: Float = startValue

        /** A finished persistent transition stays registered so its value keeps being defended. */
        var finished: Boolean = false
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
            val persistent: Boolean,
        ) : Command()

        class Remove(
            override val key: Key,
        ) : Command()
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

    /**
     * Accepts or refuses the property for native playback; false sends it to the loop.
     * There is no later demotion path - the same contract the Apple backend has.
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
        // With animations disabled the loop settles the final style without animating;
        // platform transitions otherwise ignore the animator duration scale.
        if (!DurationScale.animationsEnabled(context)) return false

        enqueue(
            Command.Start(
                Key(viewTag, propertyId),
                writer,
                fromValue,
                toValue,
                durationMs,
                startTimestampMs,
                interpolator,
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
     * One asynchronous main-looper message per burst, not one per transition: per-command
     * messages flood the looper under churn, and a synchronous message can be deferred by
     * a traversal's sync barrier until the committed end value was already drawn.
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

    private fun hasPendingCommand(key: Key): Boolean =
        synchronized(commandLock) {
            pendingCommands.any { it.key == key }
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
                is Command.Start -> beginTransition(command)
                is Command.Remove -> dropTransition(command)
            }
        }
        batch.clear()
        spareCommands = batch
    }

    private fun beginTransition(command: Command.Start) {
        val key = command.key
        // A fresh token invalidates any retry still queued for this key.
        val token = ++nextStartToken
        startTokens[key] = token
        beginWhenMounted(key, token, command.startTimestampMs + command.durationMs, command.persistent) {
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
                    command.persistent,
                )
            } != null
        }
    }

    private fun dropTransition(command: Command.Remove) {
        val key = command.key
        // Also drops any queued retry for this key.
        startTokens.remove(key)
        val dropped = transitions.remove(key) ?: return
        // A persistent value has no committed style to settle to; leave it as drawn.
        if (dropped.persistent) return
        val view = dropped.viewRef.get() ?: return
        // Settle on the committed target so the view does not stick mid-flight, but only
        // if nothing newer was written: a racing mount may have applied a fresh value.
        if (dropped.writer.get(view) == dropped.current) {
            dropped.writer.setValue(view, dropped.toValue)
        }
    }

    /**
     * A tag can be registered before its View mounts; retry per frame until it does.
     * The absolute start timestamp makes a late start seek instead of drift, and an
     * already-ended timeline stops retrying without any arbitrary timeout.
     */
    private fun beginWhenMounted(
        key: Key,
        token: Long,
        endTimestampMs: Double,
        persistent: Boolean,
        begin: () -> Boolean,
    ) {
        if (startTokens[key] != token) return
        if (hasPendingCommand(key)) {
            // A queued command may invalidate this token; let the flush run first.
            Choreographer.getInstance().postFrameCallback { beginWhenMounted(key, token, endTimestampMs, persistent, begin) }
            return
        }
        // A persistent value outlives its timeline, so its start never expires.
        if (begin() || (!persistent && animationTimestamp() >= endTimestampMs)) {
            startTokens.remove(key)
            return
        }
        Choreographer.getInstance().postFrameCallback { beginWhenMounted(key, token, endTimestampMs, persistent, begin) }
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
        persistent: Boolean,
    ) {
        // Resume interruptions from the last written value; fromValue would snap back.
        val startValue = transitions.remove(key)?.current ?: fromValue.toFloat()

        // The target is already committed; show the start value until the first pump frame.
        writer.setValue(view, startValue)

        transitions[key] =
            RunningTransition(
                view,
                writer,
                startValue,
                toValue.toFloat(),
                startTimestampMs,
                durationMs.coerceAtLeast(1.0),
                interpolator,
                persistent,
            )
        reconciler.track(view)
        ensurePumping()
    }

    private fun ensurePumping() {
        if (!pumping) {
            pumping = true
            Choreographer.getInstance().postFrameCallback(framePump)
        }
    }

    /** Re-asserts each transition's own value wherever a commit overwrote it. */
    private fun repairClobberedValues(): Boolean {
        if (!mountedSinceLastDraw) return transitions.isNotEmpty()
        mountedSinceLastDraw = false
        val iterator = transitions.values.iterator()
        while (iterator.hasNext()) {
            val running = iterator.next()
            val view = running.viewRef.get()
            if (view == null) {
                iterator.remove()
                continue
            }
            // setAlpha early-outs when unchanged, so re-asserting is free.
            running.writer.setValue(view, running.current)
        }
        return transitions.isNotEmpty()
    }

    private fun viewForTag(viewTag: Int): View? =
        try {
            fabricUIManager.resolveView(viewTag)
        } catch (e: IllegalViewOperationException) {
            // Thrown, not null, when the tag is registered but the View does not exist yet.
            null
        }
}
