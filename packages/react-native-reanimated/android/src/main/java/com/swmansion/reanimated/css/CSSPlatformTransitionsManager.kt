package com.swmansion.reanimated.css

import android.animation.TimeInterpolator
import android.os.Handler
import android.os.Looper
import android.os.Message
import android.util.FloatProperty
import android.view.Choreographer
import android.view.View
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import java.lang.ref.WeakReference

internal class CSSPlatformTransitionsManager(
    private val fabricUIManager: FabricUIManager,
    private val reactContext: WeakReference<ReactApplicationContext>,
    private val animationTimestamp: () -> Long,
) {
    private val transitions = HashMap<Key, RunningTransition>()
    private val reconciler = CSSPlatformTransitionReconciler(::repairClobberedValues)
    private val startTokens = HashMap<Key, Long>()

    /** Monotonic so a token is never reused, even after its entry is dropped. */
    private var nextStartToken = 0L

    /** Access-ordered and capped: runtime-computed easing points would otherwise grow it forever. */
    private val interpolators =
        object : LinkedHashMap<InterpolatorKey, TimeInterpolator>(16, 0.75f, true) {
            override fun removeEldestEntry(eldest: MutableMap.MutableEntry<InterpolatorKey, TimeInterpolator>): Boolean = size > 64
        }

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
                    val t = (elapsedMs / running.durationMs).toFloat().coerceAtMost(1f)
                    val value =
                        running.startValue +
                            (running.toValue - running.startValue) * running.interpolator.getInterpolation(t)
                    running.current = value
                    // setAlpha early-outs on unchanged values, so unconditional writes cost nothing.
                    running.writer.setValue(view, value)
                    if (t < 1f) {
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
        val propertyName: String,
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
        class Start(
            val viewTag: Int,
            val propertyName: String,
            val writer: FloatProperty<View>,
            val fromValue: Double,
            val toValue: Double,
            val durationMs: Double,
            val startTimestampMs: Double,
            val easingType: Int,
            val pointsX: FloatArray,
            val pointsY: FloatArray,
            val persistent: Boolean,
        ) : Command()

        class Remove(
            val viewTag: Int,
            val propertyName: String,
        ) : Command()
    }

    /** FloatArray equals is identity; only content comparison makes cache hits possible. */
    private class InterpolatorKey(
        private val type: Int,
        private val pointsX: FloatArray,
        private val pointsY: FloatArray,
    ) {
        override fun equals(other: Any?): Boolean =
            other is InterpolatorKey &&
                type == other.type &&
                pointsX.contentEquals(other.pointsX) &&
                pointsY.contentEquals(other.pointsY)

        override fun hashCode(): Int = 31 * (31 * type + pointsX.contentHashCode()) + pointsY.contentHashCode()
    }

    /**
     * Accepts or refuses the property for native playback; false sends it to the loop.
     * There is no later demotion path - the same contract the Apple backend has.
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
        // With animations disabled the loop settles the final style without animating;
        // platform transitions otherwise ignore the animator duration scale.
        if (!DurationScale.animationsEnabled(context)) return false

        enqueue(
            Command.Start(
                viewTag,
                propertyName,
                writer,
                fromValue,
                toValue,
                durationMs,
                startTimestampMs,
                easingType,
                easingPointsX,
                easingPointsY,
                persistent,
            ),
        )
        return true
    }

    fun removeTransition(
        viewTag: Int,
        propertyName: String,
    ) {
        enqueue(Command.Remove(viewTag, propertyName))
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
            pendingCommands.any { command ->
                when (command) {
                    is Command.Start -> command.viewTag == key.viewTag && command.propertyName == key.propertyName
                    is Command.Remove -> command.viewTag == key.viewTag && command.propertyName == key.propertyName
                }
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
                is Command.Start -> beginTransition(command)
                is Command.Remove -> dropTransition(command)
            }
        }
        batch.clear()
        spareCommands = batch
    }

    private fun beginTransition(command: Command.Start) {
        val key = Key(command.viewTag, command.propertyName)
        // A fresh token invalidates any retry still queued for this key.
        val token = ++nextStartToken
        startTokens[key] = token
        beginWhenMounted(key, token, command.startTimestampMs + command.durationMs, command.persistent) {
            viewForTag(command.viewTag)?.also { view ->
                val interpolator = interpolatorFor(command.easingType, command.pointsX, command.pointsY)
                start(
                    view,
                    key,
                    command.writer,
                    command.fromValue,
                    command.toValue,
                    command.durationMs,
                    command.startTimestampMs,
                    interpolator,
                    command.persistent,
                )
            } != null
        }
    }

    private fun dropTransition(command: Command.Remove) {
        val key = Key(command.viewTag, command.propertyName)
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

    /**
     * PathInterpolator flattens its curve natively on construction, so cache it. Type is
     * part of the key: different easing families can share one point list.
     */
    private fun interpolatorFor(
        type: Int,
        pointsX: FloatArray,
        pointsY: FloatArray,
    ): TimeInterpolator {
        val key = InterpolatorKey(type, pointsX, pointsY)
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
