package com.swmansion.reanimated.nativeAnimations

internal class TrackSpec(
    val target: Int,
    val endpointPolicy: Int,
    val startForm: Int,
    val startValue: DoubleArray,
    val delayMs: Double,
    val durationMs: Double,
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
        val delayMs = nextDouble()
        val durationMs = nextDouble()
        val startForm = nextInt()
        val componentCount = nextInt()
        val startValue = nextValue(componentCount)
        val segments = List(nextInt()) { nextSegment(componentCount) }
        return TrackSpec(target, endpointPolicy, startForm, startValue, delayMs, durationMs, segments)
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
