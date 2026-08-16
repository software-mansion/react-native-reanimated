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
        // ReactViewGroup owns opacity: it hides the view when backfaceVisibility is hidden and
        // a rotation turns it away, and re-applies the value it stored on every transform
        // commit. Writing alpha directly would defeat the first and be reverted by the second.
        if (view is ReactViewGroup) {
            view.setOpacityIfPossible(value)
        } else {
            view.alpha = value
        }
    }

    override fun get(view: View): Float = view.alpha
}
