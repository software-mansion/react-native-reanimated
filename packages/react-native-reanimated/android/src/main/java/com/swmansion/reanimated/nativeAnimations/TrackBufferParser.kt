package com.swmansion.reanimated.nativeAnimations

internal class TrackSpec(
    val target: Int,
    val endpointPolicy: Int,
    val startForm: Int,
    val binding: Int,
    /** The components of one value of each timeline. */
    val componentCount: Int,
    val delayMs: Double,
    val durationMs: Double,
    val timelines: List<ComponentSpec>,
) {
    /** The components of the start value of the track: the start of each timeline, in order. */
    val startValue: DoubleArray
        get() = timelines.fold(DoubleArray(0)) { value, timeline -> value + timeline.startValue }

    val operations: IntArray
        get() = timelines.map { it.operation }.toIntArray()
}

/** The timeline of one slot of the track value: the whole value, or one operation of a transform. */
internal class ComponentSpec(
    val operation: Int,
    val startValue: DoubleArray,
    val segments: List<SegmentSpec>,
)

internal class SegmentSpec(
    val endOffset: Double,
    val endValue: DoubleArray,
    val timing: TimingKey,
)

/** Reads the buffers of `encodeTracks` in AndroidNativeAnimationPlatform.cpp. */
internal class TrackBufferParser(
    private val ints: IntArray,
    private val doubles: DoubleArray,
) {
    private var intIndex = 0
    private var doubleIndex = 0

    fun parse(): List<TrackSpec> = List(nextInt()) { nextTrack() }

    private fun nextTrack(): TrackSpec {
        val target = nextInt()
        val endpointPolicy = nextInt()
        val startForm = nextInt()
        val binding = nextInt()
        val componentCount = nextInt()
        val delayMs = nextDouble()
        val durationMs = nextDouble()
        val timelines = List(nextInt()) { nextTimeline(componentCount) }
        return TrackSpec(target, endpointPolicy, startForm, binding, componentCount, delayMs, durationMs, timelines)
    }

    private fun nextTimeline(componentCount: Int): ComponentSpec {
        val operation = nextInt()
        val startValue = nextValue(componentCount)
        val segments = List(nextInt()) { nextSegment(componentCount) }
        return ComponentSpec(operation, startValue, segments)
    }

    private fun nextSegment(componentCount: Int): SegmentSpec {
        val timingKind = nextInt()
        val endOffset = nextDouble()
        val endValue = nextValue(componentCount)
        val pointCount = nextInt()
        val pointsX = ArrayList<Float>(pointCount)
        val pointsY = ArrayList<Float>(pointCount)
        repeat(pointCount) {
            pointsX.add(nextDouble().toFloat())
            pointsY.add(nextDouble().toFloat())
        }
        return SegmentSpec(endOffset, endValue, TimingKey(timingKind, pointsX, pointsY))
    }

    private fun nextValue(componentCount: Int): DoubleArray = DoubleArray(componentCount) { nextDouble() }

    private fun nextInt(): Int = ints[intIndex++]

    private fun nextDouble(): Double = doubles[doubleIndex++]
}
