package com.swmansion.reanimated.view

import android.content.Context
import android.view.ViewGroup
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ReactPointerEventsView

class REASharedTransitionBoundaryView(
    context: Context,
) : ViewGroup(context),
    ReactPointerEventsView {
    init {
        // Children can lie outside the boundary's frame — moved by an animation
        // without a re-layout, or laid out at negative coordinates — so they
        // must not be clipped.
        clipChildren = false
    }

    override val pointerEvents: PointerEvents
        get() = PointerEvents.BOX_NONE

    override fun onLayout(
        changed: Boolean,
        l: Int,
        t: Int,
        r: Int,
        b: Int,
    ) {}
}
