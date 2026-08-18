package com.swmansion.reanimated.css

import android.util.FloatProperty
import android.view.View
import com.facebook.react.views.view.ReactViewGroup

/**
 * The View property React Native itself writes, so a commit can overwrite a running animation.
 * Ids must match `platformPropertyId` in CSSPlatformTransitions.cpp.
 */
internal fun cssPropertyWriterFor(propertyId: Int): FloatProperty<View>? =
    when (propertyId) {
        0 -> AlphaProperty
        else -> null
    }

private object AlphaProperty : FloatProperty<View>("alpha") {
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
