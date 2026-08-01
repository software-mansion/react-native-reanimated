package com.swmansion.reanimated.css

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
    private val transitions = HashMap<Key, RunningTransition>()
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

    private var pumping = false

    /**
     * Single per-frame driver for every running transition. The absolute start timestamp
     * makes delay and late-start seeking fall out of the arithmetic: t < 0 during the
     * delay clamps to 0 and holds the start value, and a late first frame lands mid-curve
     * instead of shifting the whole timeline.
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
                        // Delay phase: hold the raw start value. Step-like easings are
                        // nonzero already at t = 0, so this cannot go through the curve.
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
                    // setValue takes a primitive and View.setAlpha early-outs on an unchanged
                    // value, so unconditional writes allocate nothing and invalidate only on
                    // real changes.
                    running.writer.setValue(view, value)
                    if (t >= 1f) {
                        if (running.persistent) running.finished = true else iterator.remove()
                    } else {
                        active = true
                    }
                }
                if (active) {
                    Choreographer.getInstance().postFrameCallback(this)
                } else {
                    pumping = false
                }
            }
        }

    private fun ensurePumping() {
        if (!pumping) {
            pumping = true
            Choreographer.getInstance().postFrameCallback(framePump)
        }
    }

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
        // Refusing sends the property to the loop, which resolves the final style without
        // animating. The animator duration scale is otherwise not applied: platform
        // transitions follow the authored CSS timeline, and the slow-animations toggle
        // already flows through the shared animation clock.
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

    private val commandLock = Any()
    private var pendingCommands = ArrayList<Command>()
    private var spareCommands = ArrayList<Command>()
    private var flushScheduled = false

    /**
     * One main-looper message per burst instead of one per transition: a render that
     * starts hundreds of transitions would otherwise flood the queue, and by the time
     * late messages ran their transitions would already be stale.
     */
    private fun enqueue(command: Command) {
        val schedule: Boolean
        synchronized(commandLock) {
            pendingCommands.add(command)
            schedule = !flushScheduled
            if (schedule) flushScheduled = true
        }
        if (schedule) UiThreadUtil.runOnUiThread { flushCommands() }
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
                is Command.Remove -> {
                    val key = Key(command.viewTag, command.propertyName)
                    // Also drops any queued retry for this key.
                    startTokens.remove(key)
                    val dropped = transitions.remove(key)
                    // The committed style already holds the target, but nothing re-writes
                    // it to the view once this entry stops being driven; without a final
                    // write the view would stick at the mid-flight value. A persistent
                    // value has no committed style to settle to, so it is left as drawn.
                    if (dropped != null && !dropped.persistent) {
                        dropped.viewRef.get()?.let { dropped.writer.setValue(it, dropped.toValue) }
                    }
                }
            }
        }
        batch.clear()
        spareCommands = batch
    }

    private fun beginTransition(command: Command.Start) {
        val key = Key(command.viewTag, command.propertyName)
        // Claiming a fresh token invalidates any retry still queued for this key, so a
        // superseded request cannot start on a later frame.
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
        persistent: Boolean,
        begin: () -> Boolean,
    ) {
        if (startTokens[key] != token) return
        // A persistent value outlives its own timeline, so its start never expires; it
        // retries until the view mounts or the key is superseded or removed.
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
        // On interruption resume from the value this engine last wrote: fromValue is the
        // committed style value, so starting there would snap the view back to where the
        // superseded transition began.
        val startValue = transitions.remove(key)?.current ?: fromValue.toFloat()

        // React Native has already committed the target; show the start value until the
        // first pump frame (and through any transition-delay).
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
            // setValue takes a primitive and setAlpha early-outs when unchanged, so an
            // unconditional re-assert is allocation-free.
            running.writer.setValue(view, running.current)
        }
        return transitions.isNotEmpty()
    }

    /** Compares the point arrays by content, so probing the cache allocates only the key. */
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
     * PathInterpolator flattens its curve natively on construction, so cache it. The
     * type is part of the key because different families can share a point list:
     * linear(0.5, 1) and cubicBezier(0, 1, 0.5, 1) both normalize to [0,1],[0.5,1].
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
