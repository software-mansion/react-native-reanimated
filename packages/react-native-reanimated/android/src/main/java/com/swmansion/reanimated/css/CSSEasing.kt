package com.swmansion.reanimated.css

import android.animation.TimeInterpolator
import android.view.animation.LinearInterpolator
import android.view.animation.PathInterpolator

/** `steps()` and `linear()` stops are evaluated directly so steps keeps its discontinuities. */
internal object CSSEasing {
    // Must match `PlatformEasing::Type` in CSSPlatformTransitions.h; 0 is linear, no constant needed.
    private const val CUBIC_BEZIER = 1
    private const val STEPS = 2
    private const val LINEAR_STOPS = 3

    fun interpolator(
        type: Int,
        pointsX: FloatArray,
        pointsY: FloatArray,
    ): TimeInterpolator =
        when (type) {
            CUBIC_BEZIER -> PathInterpolator(pointsX[0], pointsY[0], pointsX[1], pointsY[1])
            STEPS -> StepsInterpolator(pointsX, pointsY)
            LINEAR_STOPS -> LinearStopsInterpolator(pointsX, pointsY)
            else -> LinearInterpolator()
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
}
