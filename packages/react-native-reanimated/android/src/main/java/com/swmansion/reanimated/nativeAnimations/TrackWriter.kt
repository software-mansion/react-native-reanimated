package com.swmansion.reanimated.nativeAnimations

import android.os.Build
import android.view.View
import androidx.annotation.RequiresApi
import com.facebook.react.uimanager.BackgroundStyleApplicator
import com.facebook.react.uimanager.LengthPercentage
import com.facebook.react.uimanager.LengthPercentageType
import com.facebook.react.uimanager.style.BorderRadiusProp
import com.facebook.react.uimanager.style.LogicalEdge
import com.facebook.react.views.view.ReactViewGroup
import kotlin.math.roundToInt

/**
 * Writes the View property that React Native itself writes, so a commit can overwrite a running track. A
 * value has one component: a scalar, or a color as its ARGB int.
 */
internal interface TrackWriter {
    /** The platform name of what the writer animates. */
    val property: String

    /** Writes the value between [from] and [to] at [progress] into [value]. */
    fun interpolate(
        from: DoubleArray,
        to: DoubleArray,
        progress: Float,
        value: DoubleArray,
    )

    fun apply(
        view: View,
        value: DoubleArray,
    )

    /** Whether the view currently shows [value]; the pre-draw repair rewrites when it does not. */
    fun shows(
        view: View,
        value: DoubleArray,
    ): Boolean

    /** What the view shows now, or null when the view has no value of the property. */
    fun readVisual(view: View): DoubleArray?

    /** The sample form of [value]: the scalar, or red, green, blue, and alpha in [0, 1] for a color. */
    fun sampleComponentsOf(value: DoubleArray): DoubleArray
}

internal fun trackWriterFor(target: Int): TrackWriter? =
    when (target) {
        TrackEncoding.TARGET_OPACITY -> AlphaWriter
        TrackEncoding.TARGET_BACKGROUND_COLOR -> ColorWriter("backgroundColor", BackgroundColorAccess)
        TrackEncoding.TARGET_BORDER_COLOR -> ColorWriter("borderColor", BorderColorAccess)
        TrackEncoding.TARGET_BORDER_RADIUS -> BorderRadiusWriter
        TrackEncoding.TARGET_SHADOW_COLOR ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) ColorWriter("shadowColor", ShadowColorAccess) else null
        else -> null
    }

private abstract class ScalarWriter : TrackWriter {
    abstract fun read(view: View): Float

    abstract fun write(
        view: View,
        value: Float,
    )

    override fun interpolate(
        from: DoubleArray,
        to: DoubleArray,
        progress: Float,
        value: DoubleArray,
    ) {
        val start = from[0].toFloat()
        value[0] = (start + progress * (to[0].toFloat() - start)).toDouble()
    }

    override fun apply(
        view: View,
        value: DoubleArray,
    ) = write(view, value[0].toFloat())

    override fun shows(
        view: View,
        value: DoubleArray,
    ): Boolean = read(view) == value[0].toFloat()

    override fun readVisual(view: View): DoubleArray = doubleArrayOf(read(view).toDouble())

    override fun sampleComponentsOf(value: DoubleArray): DoubleArray = value.copyOf()
}

private object AlphaWriter : ScalarWriter() {
    override val property = "alpha"

    override fun write(
        view: View,
        value: Float,
    ) {
        // ReactViewGroup owns opacity: it zeroes alpha when a hidden backface turns away, and
        // re-applies its stored value on every transform commit. A direct alpha write loses both.
        if (view is ReactViewGroup) {
            view.setOpacityIfPossible(value)
        } else {
            view.alpha = value
        }
    }

    override fun read(view: View): Float = view.alpha
}

private object BorderRadiusWriter : ScalarWriter() {
    override val property = "borderRadius"

    override fun write(
        view: View,
        value: Float,
    ) {
        BackgroundStyleApplicator.setBorderRadius(
            view,
            BorderRadiusProp.BORDER_RADIUS,
            LengthPercentage(value, LengthPercentageType.POINT),
        )
    }

    override fun read(view: View): Float {
        val radius = BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_RADIUS) ?: return 0f
        // Percent radii never route here (the parser rejects them), so the reference is unused.
        return if (radius.type == LengthPercentageType.POINT) radius.resolve(0f) else 0f
    }
}

private interface ColorAccess {
    fun read(view: View): Int?

    fun write(
        view: View,
        color: Int,
    )
}

private object BackgroundColorAccess : ColorAccess {
    override fun read(view: View): Int? = BackgroundStyleApplicator.getBackgroundColor(view)

    override fun write(
        view: View,
        color: Int,
    ) = BackgroundStyleApplicator.setBackgroundColor(view, color)
}

private object BorderColorAccess : ColorAccess {
    override fun read(view: View): Int? = BackgroundStyleApplicator.getBorderColor(view, LogicalEdge.ALL)

    override fun write(
        view: View,
        color: Int,
    ) = BackgroundStyleApplicator.setBorderColor(view, LogicalEdge.ALL, color)
}

/** Mirrors BaseViewManager.setShadowColor, which writes the same color to both shadows. */
@RequiresApi(Build.VERSION_CODES.P)
private object ShadowColorAccess : ColorAccess {
    override fun read(view: View): Int? = view.outlineAmbientShadowColor

    override fun write(
        view: View,
        color: Int,
    ) {
        view.outlineAmbientShadowColor = color
        view.outlineSpotShadowColor = color
    }
}

/** Blends per channel in sRGB, as the loop does. */
private class ColorWriter(
    override val property: String,
    private val access: ColorAccess,
) : TrackWriter {
    override fun interpolate(
        from: DoubleArray,
        to: DoubleArray,
        progress: Float,
        value: DoubleArray,
    ) {
        val fromColor = from[0].toColorInt()
        val toColor = to[0].toColorInt()
        var result = 0
        for (shift in CHANNEL_SHIFTS) {
            val fromChannel = (fromColor ushr shift) and 0xFF
            val toChannel = (toColor ushr shift) and 0xFF
            val channel = (fromChannel + ((toChannel - fromChannel) * progress).roundToInt()).coerceIn(0, 255)
            result = result or (channel shl shift)
        }
        value[0] = result.toColorValue()
    }

    override fun apply(
        view: View,
        value: DoubleArray,
    ) = access.write(view, value[0].toColorInt())

    override fun shows(
        view: View,
        value: DoubleArray,
    ): Boolean = access.read(view) == value[0].toColorInt()

    override fun readVisual(view: View): DoubleArray? = access.read(view)?.let { doubleArrayOf(it.toColorValue()) }

    override fun sampleComponentsOf(value: DoubleArray): DoubleArray {
        val color = value[0].toColorInt()
        return RGBA_SHIFTS.map { shift -> ((color ushr shift) and 0xFF) / 255.0 }.toDoubleArray()
    }

    private companion object {
        val CHANNEL_SHIFTS = intArrayOf(24, 16, 8, 0)
        val RGBA_SHIFTS = intArrayOf(16, 8, 0, 24)
    }
}

/** C++ packs ARGB into the integral part of the double, losslessly below 2^32. */
private fun Double.toColorInt(): Int = toLong().toInt()

private fun Int.toColorValue(): Double = (toLong() and 0xFFFFFFFFL).toDouble()
