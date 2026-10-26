package com.swmansion.reanimated.nativeAnimations

import android.animation.TimeInterpolator
import android.view.animation.LinearInterpolator
import android.view.animation.PathInterpolator
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.sin

/**
 * The value of a track at a fraction of its animator. The animator plays linearly over the lead before the
 * start time, the delay, and the duration of the track; the start value shows for the lead and the delay.
 */
internal class Timeline(
    /** One timeline for each slot of the track value, in slot order. */
    val components: List<ComponentTimeline>,
    private val holdFraction: Float,
) {
    /** Writes the components of the value at [fraction] into [value]. */
    fun fill(
        fraction: Float,
        value: DoubleArray,
    ) {
        // Not `<=`: at the boundary a jump-start step already owes its first step.
        if (fraction < holdFraction) {
            components.forEach { it.fillStart(value) }
        } else if (holdFraction >= 1f) {
            // A zero duration is all hold, so the end value shows only at the last frame.
            components.forEach { it.fillEnd(value) }
        } else {
            val progress = (fraction - holdFraction) / (1f - holdFraction)
            components.forEach { it.fill(progress, value) }
        }
    }

    fun release(timingCache: TimingCache) = components.forEach { it.release(timingCache) }
}

/** Writes the value of one slot of the track value from its own segments. */
internal fun interface SlotInterpolation {
    fun interpolate(
        from: DoubleArray,
        to: DoubleArray,
        progress: Float,
        value: DoubleArray,
        slot: Int,
    )
}

/** An operation of a transform: one scalar in its slot. */
internal val SCALAR_SLOT =
    SlotInterpolation { from, to, progress, value, slot -> value[slot] = from[0] + progress * (to[0] - from[0]) }

internal class ComponentTimeline(
    private val slot: Int,
    /** The components of the start value, then of the end value of each segment. */
    val values: List<DoubleArray>,
    /** The end of each segment as a part of the duration. */
    val endOffsets: DoubleArray,
    private val timings: List<TimeInterpolator>,
    private val timingKeys: List<TimingKey>,
    private val interpolation: SlotInterpolation,
) {
    fun fillStart(value: DoubleArray) {
        values.first().copyInto(value, slot)
    }

    fun fillEnd(value: DoubleArray) {
        values.last().copyInto(value, slot)
    }

    fun fill(
        progress: Float,
        value: DoubleArray,
    ) {
        var segment = 0
        while (segment < endOffsets.lastIndex && progress > endOffsets[segment]) segment++
        val segmentStart = if (segment == 0) 0f else endOffsets[segment - 1].toFloat()
        val segmentProgress = (progress - segmentStart) / (endOffsets[segment].toFloat() - segmentStart)
        val easedProgress = timings[segment].getInterpolation(segmentProgress)
        interpolation.interpolate(values[segment], values[segment + 1], easedProgress, value, slot)
    }

    fun release(timingCache: TimingCache) = timingKeys.forEach(timingCache::release)
}

internal data class TimingKey(
    val kind: Int,
    /** The x and the y of each point of a curve, or the decay, the frequency, and the initial velocity of a spring. */
    val parameters: List<Float>,
)

/** PathInterpolator flattens its curve on construction, so each curve is built once while a track uses it. */
internal class TimingCache {
    private class Entry(
        val interpolator: TimeInterpolator,
        var users: Int,
    )

    private val entries = HashMap<TimingKey, Entry>()

    /** Throws IllegalArgumentException for a cubic Bezier curve that PathInterpolator refuses. */
    fun acquire(key: TimingKey): TimeInterpolator {
        val entry = entries.getOrPut(key) { Entry(interpolatorOf(key), 0) }
        entry.users++
        return entry.interpolator
    }

    fun release(key: TimingKey) {
        val entry = entries[key] ?: return
        if (--entry.users == 0) entries.remove(key)
    }

    fun clear() = entries.clear()

    private fun interpolatorOf(key: TimingKey): TimeInterpolator {
        val parameters = key.parameters
        return when (key.kind) {
            TrackEncoding.TIMING_CUBIC_BEZIER -> PathInterpolator(parameters[0], parameters[1], parameters[2], parameters[3])
            TrackEncoding.TIMING_STEPS -> StepsInterpolator(pointsXOf(parameters), pointsYOf(parameters))
            TrackEncoding.TIMING_LINEAR_STOPS -> LinearStopsInterpolator(pointsXOf(parameters), pointsYOf(parameters))
            TrackEncoding.TIMING_SPRING ->
                SpringInterpolator(parameters[0].toDouble(), parameters[1].toDouble(), parameters[2].toDouble())
            else -> LinearInterpolator()
        }
    }
}

private fun pointsXOf(parameters: List<Float>) = FloatArray(parameters.size / 2) { parameters[2 * it] }

private fun pointsYOf(parameters: List<Float>) = FloatArray(parameters.size / 2) { parameters[2 * it + 1] }

/** `steps()` and `linear()` stops are evaluated directly so steps keeps its discontinuities. */
private class StepsInterpolator(
    private val pointsX: FloatArray,
    private val pointsY: FloatArray,
) : TimeInterpolator {
    override fun getInterpolation(input: Float): Float = pointsY[firstSmallerOrEqual(input, pointsX)]
}

private class LinearStopsInterpolator(
    private val pointsX: FloatArray,
    private val pointsY: FloatArray,
) : TimeInterpolator {
    override fun getInterpolation(input: Float): Float {
        val left = firstSmallerOrEqual(input, pointsX)
        if (left == pointsX.size - 1) return pointsY[left]
        val slope = (pointsY[left + 1] - pointsY[left]) / (pointsX[left + 1] - pointsX[left])
        return pointsY[left] + slope * (input - pointsX[left])
    }
}

/** The progress of `SpringTiming` in `NativeAnimationTiming.h`. */
private class SpringInterpolator(
    private val decay: Double,
    private val frequency: Double,
    private val initialVelocity: Double,
) : TimeInterpolator {
    override fun getInterpolation(input: Float): Float {
        if (input >= 1f) return 1f
        val time = input.toDouble()
        val motion =
            if (frequency > 0) {
                cos(frequency * time) + (decay - initialVelocity) / frequency * sin(frequency * time)
            } else {
                1 + (decay - initialVelocity) * time
            }
        return (1 - exp(-decay * time) * motion).toFloat()
    }
}

private fun firstSmallerOrEqual(
    x: Float,
    pointsX: FloatArray,
): Int {
    var low = 0
    var high = pointsX.size
    while (low < high) {
        val mid = (low + high) ushr 1
        if (pointsX[mid] <= x) low = mid + 1 else high = mid
    }
    return if (low == 0) 0 else low - 1
}
