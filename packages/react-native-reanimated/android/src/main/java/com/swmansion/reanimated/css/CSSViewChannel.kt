package com.swmansion.reanimated.css

import android.os.Build
import android.util.FloatProperty
import android.view.View
import androidx.annotation.RequiresApi

/**
 * A channel must be *orthogonal*: a field React Native never writes itself, so a
 * Fabric commit re-applying the prop cannot clobber a running animation.
 */
internal interface CSSViewChannel {
    val property: FloatProperty<View>

    fun canAnimateTo(toValue: Double): Boolean = true

    fun channelValue(
        value: Double,
        toValue: Double,
    ): Float

    fun renderedValue(view: View): Double

    fun prepare(
        view: View,
        toValue: Double,
    )

    fun reset(view: View)
}

/**
 * Rendered alpha is `mAlpha * transitionAlpha`, so to show `f` we write `f / mAlpha`
 * and [prepare] pins `mAlpha` to the target React is about to commit, keeping the
 * denominator still. `setTransitionAlpha` does not clamp - hwui clamps the product -
 * so a fade-out's `from / to > 1` renders exactly.
 */
@RequiresApi(Build.VERSION_CODES.Q)
private object TransitionAlphaChannel : CSSViewChannel {
    override val property =
        object : FloatProperty<View>("transitionAlpha") {
            override fun setValue(
                view: View,
                value: Float,
            ) {
                view.transitionAlpha = value
            }

            override fun get(view: View): Float = view.transitionAlpha
        }

    // Anything times zero is zero, so a fade to fully transparent is inexpressible.
    override fun canAnimateTo(toValue: Double): Boolean = toValue > 0.0

    override fun channelValue(
        value: Double,
        toValue: Double,
    ): Float = (value / toValue).toFloat()

    override fun renderedValue(view: View): Double = (view.alpha * view.transitionAlpha).toDouble()

    override fun prepare(
        view: View,
        toValue: Double,
    ) {
        view.alpha = toValue.toFloat()
    }

    override fun reset(view: View) {
        view.transitionAlpha = 1f
    }
}

@RequiresApi(Build.VERSION_CODES.Q)
internal fun cssViewChannelFor(propertyName: String): CSSViewChannel? =
    when (propertyName) {
        "opacity" -> TransitionAlphaChannel
        else -> null
    }
