package com.swmansion.reanimated.css

import android.util.FloatProperty
import android.view.View
import com.facebook.react.uimanager.BackgroundStyleApplicator
import com.facebook.react.uimanager.LengthPercentage
import com.facebook.react.uimanager.LengthPercentageType
import com.facebook.react.uimanager.style.BorderRadiusProp
import com.facebook.react.uimanager.style.LogicalEdge
import com.facebook.react.views.view.ReactViewGroup
import kotlin.math.roundToInt

/** The View property React Native itself writes, so a commit can overwrite a running animation. */
internal abstract class CSSPropertyWriter(
    name: String,
) : FloatProperty<View>(name) {
    open fun animatorEndpoints(
        fromBits: Double,
        toBits: Double,
    ): Pair<Double, Double> = fromBits to toBits

    /** Whether the view currently shows [value]; the pre-draw repair rewrites when it does not. */
    open fun matches(
        view: View,
        value: Float,
    ): Boolean = get(view) == value

    /**
     * Where an interrupting transition starts so the view keeps showing what it shows now.
     * A writer whose floats cannot express that value rebases its endpoints instead.
     */
    open fun resumeFrom(view: View): Float = get(view)
}

/**
 * A property id is its index in `kAndroidPlatformProperties` (platform.h), so the branches
 * below are in that order. Color endpoints arrive packed as ARGB, scalars as plain values.
 */
internal fun cssPropertyWriterFor(
    propertyId: Int,
    fromBits: Double,
    toBits: Double,
): CSSPropertyWriter? =
    when (propertyId) {
        0 -> AlphaProperty
        1 -> ColorBlendWriter("backgroundColor", fromBits.toColorInt(), toBits.toColorInt(), BackgroundColorAccess)
        2 -> ColorBlendWriter("borderColor", fromBits.toColorInt(), toBits.toColorInt(), BorderColorAccess)
        3 -> BorderRadiusWriter
        else -> null
    }

/** C++ packs ARGB into the integral part of the double, losslessly below 2^32. */
private fun Double.toColorInt(): Int = toLong().toInt()

private object AlphaProperty : CSSPropertyWriter("alpha") {
    override fun setValue(
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

    override fun get(view: View): Float = view.alpha
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

/**
 * Colors animate as a 0..1 blend fraction between the endpoints the start command carried,
 * which keeps the animator float-based. Blending is per-channel in sRGB, as the loop does.
 */
private class ColorBlendWriter(
    name: String,
    private var fromColor: Int,
    private val toColor: Int,
    private val access: ColorAccess,
) : CSSPropertyWriter(name) {
    override fun animatorEndpoints(
        fromBits: Double,
        toBits: Double,
    ): Pair<Double, Double> = 0.0 to 1.0

    override fun setValue(
        view: View,
        value: Float,
    ) = access.write(view, blend(value))

    // Unused: both endpoints are known up front, and matches/resumeFrom read the view.
    override fun get(view: View): Float = 0f

    /**
     * The interrupted color rarely lies on the new segment, so no fraction of it resumes from
     * screen. Take that color as the starting endpoint and play the segment from zero.
     */
    override fun resumeFrom(view: View): Float {
        access.read(view)?.let { fromColor = it }
        return 0f
    }

    override fun matches(
        view: View,
        value: Float,
    ): Boolean = access.read(view) == blend(value)

    private fun blend(fraction: Float): Int {
        var result = 0
        for (shift in CHANNEL_SHIFTS) {
            val from = (fromColor ushr shift) and 0xFF
            val to = (toColor ushr shift) and 0xFF
            val channel = (from + ((to - from) * fraction).roundToInt()).coerceIn(0, 255)
            result = result or (channel shl shift)
        }
        return result
    }

    private companion object {
        val CHANNEL_SHIFTS = intArrayOf(24, 16, 8, 0)
    }
}

private object BorderRadiusWriter : CSSPropertyWriter("borderRadius") {
    override fun setValue(
        view: View,
        value: Float,
    ) {
        BackgroundStyleApplicator.setBorderRadius(
            view,
            BorderRadiusProp.BORDER_RADIUS,
            LengthPercentage(value, LengthPercentageType.POINT),
        )
    }

    override fun get(view: View): Float {
        val radius = BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_RADIUS) ?: return 0f
        // Percent radii never route here (the parser rejects them), so the reference is unused.
        return if (radius.type == LengthPercentageType.POINT) radius.resolve(0f) else 0f
    }
}
