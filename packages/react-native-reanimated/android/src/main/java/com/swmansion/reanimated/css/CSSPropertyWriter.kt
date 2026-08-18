package com.swmansion.reanimated.css

import android.util.FloatProperty
import android.view.View

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
        view.alpha = value
    }

    override fun get(view: View): Float = view.alpha
}
