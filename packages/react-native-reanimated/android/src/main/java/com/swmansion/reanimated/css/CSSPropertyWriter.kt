package com.swmansion.reanimated.css

import android.util.FloatProperty
import android.view.View

/**
 * The View property React Native itself writes for a CSS property. Animating the
 * same field RN writes means a commit can overwrite a running animation, which the
 * pre-draw reconciliation repairs.
 */
internal fun cssPropertyWriterFor(propertyName: String): FloatProperty<View>? =
    when (propertyName) {
        "opacity" -> AlphaProperty
        else -> null
    }

private object AlphaProperty : FloatProperty<View>("alpha") {
    override fun setValue(
        view: View,
        value: Float,
    ) {
        view.alpha = value
    }

    override fun get(view: View): Float = view.alpha
}
