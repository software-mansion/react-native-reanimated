package com.swmansion.reanimated.view

import android.content.Context
import android.graphics.Rect
import android.view.View
import android.view.ViewGroup
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ReactPointerEventsView

class REASharedTransitionBoundaryView(
    context: Context,
) : ViewGroup(context),
    ReactPointerEventsView {
    private val layoutFrame = Rect()
    private val parentLayoutListener =
        OnLayoutChangeListener { _, _, _, _, _, _, _, _, _ -> coverParent() }

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
    ) {
        layoutFrame.set(l, t, r, b)
        coverParent()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        (parent as? View)?.addOnLayoutChangeListener(parentLayoutListener)
        coverParent()
    }

    override fun onDetachedFromWindow() {
        (parent as? View)?.removeOnLayoutChangeListener(parentLayoutListener)
        super.onDetachedFromWindow()
    }

    override fun onScrollChanged(
        l: Int,
        t: Int,
        oldl: Int,
        oldt: Int,
    ) {
        super.onScrollChanged(l, t, oldl, oldt)
        for (i in 0 until childCount) {
            (getChildAt(i) as? REASharedTransitionBoundaryView)?.coverParent()
        }
    }

    // Android only delivers touches within a view's bounds, so a child moved
    // out of the laid out frame without a re-layout would stop receiving them.
    // Cover the parent's visible area, which bounds the touches anyway, and
    // scroll the children back to where the layout placed them.
    private fun coverParent() {
        val parent = parent as? View ?: return
        val left = minOf(layoutFrame.left, parent.scrollX)
        val top = minOf(layoutFrame.top, parent.scrollY)
        setLeft(left)
        setTop(top)
        setRight(maxOf(layoutFrame.right, parent.scrollX + parent.width))
        setBottom(maxOf(layoutFrame.bottom, parent.scrollY + parent.height))
        scrollTo(left - layoutFrame.left, top - layoutFrame.top)
    }
}
