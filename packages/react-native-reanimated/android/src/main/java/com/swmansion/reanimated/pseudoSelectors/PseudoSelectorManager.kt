package com.swmansion.reanimated.pseudoSelectors

import android.view.MotionEvent
import android.view.View
import android.view.ViewParent
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.swmansion.reanimated.nativeProxy.PseudoSelectorCallback

class PseudoSelectorManager(
    private val fabricUIManager: FabricUIManager,
) {
    // Key = "$tag:$selectorInt" - allows multiple selectors per view.
    private val detachActions = HashMap<String, Runnable>()

    private val activeCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()

    private val activeDeepestViews = LinkedHashSet<View>()

    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()

    private val hoveredViews = LinkedHashSet<View>()

    // Reused by updateHoverStates to avoid allocating on every hover event (UI thread only).
    private val hoverLocationBuffer = IntArray(2)

    fun attach(
        tag: Int,
        selector: Int,
        callback: PseudoSelectorCallback,
    ) {
        UiThreadUtil.runOnUiThread {
            val view = fabricUIManager.resolveView(tag) ?: return@runOnUiThread
            val key = "$tag:$selector"
            when (selector) {
                0 -> attachFocusWithin(view, key, callback)
                1 -> attachFocus(view, key, callback)
                2 -> attachHover(view, key, callback)
                3 -> attachActive(view, key, callback)
                4 -> attachActiveDeepest(view, key, callback)
            }
        }
    }

    private fun attachFocusWithin(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        var isFocused = false
        val listener =
            android.view.ViewTreeObserver.OnGlobalFocusChangeListener { _, _ ->
                val hasFocus = view.hasFocus()
                if (hasFocus && !isFocused) {
                    isFocused = true
                    callback.onSelectorStateChanged(true)
                } else if (!hasFocus && isFocused) {
                    isFocused = false
                    callback.onSelectorStateChanged(false)
                }
            }
        view.viewTreeObserver.addOnGlobalFocusChangeListener(listener)
        detachActions[key] =
            Runnable { view.viewTreeObserver.removeOnGlobalFocusChangeListener(listener) }
    }

    private fun attachFocus(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        var isFocused = false
        val listener =
            android.view.ViewTreeObserver.OnGlobalFocusChangeListener { _, newFocus ->
                val directFocus = newFocus == view
                if (directFocus && !isFocused) {
                    isFocused = true
                    callback.onSelectorStateChanged(true)
                } else if (!directFocus && isFocused) {
                    isFocused = false
                    callback.onSelectorStateChanged(false)
                }
            }
        view.viewTreeObserver.addOnGlobalFocusChangeListener(listener)
        detachActions[key] =
            Runnable { view.viewTreeObserver.removeOnGlobalFocusChangeListener(listener) }
    }

    private fun attachHover(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        // Android sends a hover event to one target, so moving onto a hoverable descendant fires
        // ACTION_HOVER_EXIT on its ancestors - but CSS :hover must stay active over descendants.
        // So recompute all registered views from the pointer position, not just the event's view.
        // Only ENTER/EXIT can flip state (always an edge crossing); MOVE is ignored.
        hoverCallbacks[view] = callback
        val listener =
            View.OnHoverListener { _, event ->
                when (event.actionMasked) {
                    MotionEvent.ACTION_HOVER_ENTER,
                    MotionEvent.ACTION_HOVER_EXIT,
                    -> updateHoverStates(event.rawX, event.rawY)
                }
                false
            }
        view.setOnHoverListener(listener)
        detachActions[key] =
            Runnable {
                hoverCallbacks.remove(view)
                if (hoveredViews.remove(view)) {
                    callback.onSelectorStateChanged(false)
                }
                view.setOnHoverListener(null)
            }
    }

    private fun attachActive(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        activeCallbacks[view] = callback
        val listener =
            View.OnTouchListener { _, event ->
                val action = event.actionMasked
                if (action == MotionEvent.ACTION_DOWN) {
                    fireActiveCallbacksUpTree(view, true)
                } else if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
                    fireActiveCallbacksUpTree(view, false)
                }
                false
            }
        view.setOnTouchListener(listener)
        detachActions[key] =
            Runnable {
                activeCallbacks.remove(view)
                view.setOnTouchListener(null)
            }
    }

    private fun attachActiveDeepest(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        activeDeepestViews.add(view)
        val listener =
            View.OnTouchListener { _, event ->
                val action = event.actionMasked
                if (action == MotionEvent.ACTION_DOWN) {
                    if (!hasDeepestDescendantAt(view, event.rawX, event.rawY)) {
                        callback.onSelectorStateChanged(true)
                    }
                    fireActiveCallbacksUpTree(view, true)
                } else if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
                    callback.onSelectorStateChanged(false)
                    fireActiveCallbacksUpTree(view, false)
                }
                false
            }
        view.setOnTouchListener(listener)
        detachActions[key] =
            Runnable {
                activeDeepestViews.remove(view)
                view.setOnTouchListener(null)
            }
    }

    fun detach(
        tag: Int,
        selector: Int,
    ) {
        UiThreadUtil.runOnUiThread { detachActions.remove("$tag:$selector")?.run() }
    }

    /**
     * Returns true if any view in `activeDeepestViews` is a strict descendant of `ancestor`
     * and contains the screen point (`rawX`, `rawY`).
     * Used by _:active-deepest_ to yield priority to deeper registered views.
     */
    private fun hasDeepestDescendantAt(
        ancestor: View,
        rawX: Float,
        rawY: Float,
    ): Boolean {
        val loc = IntArray(2)
        // TODO: Optimize so we don't iterate over all the views with :active-deepest every time.
        for (candidate in activeDeepestViews) {
            if (candidate === ancestor) continue
            if (!isDescendantOf(candidate, ancestor)) continue
            candidate.getLocationOnScreen(loc)
            if (rawX >= loc[0] && rawX <= loc[0] + candidate.width &&
                rawY >= loc[1] && rawY <= loc[1] + candidate.height
            ) {
                return true
            }
        }
        return false
    }

    /**
     * Walk up its ancestor chain and fire
     * the callback for every ancestor that has _:active_ registered.
     */
    private fun fireActiveCallbacksUpTree(
        source: View,
        isActive: Boolean,
    ) {
        activeCallbacks[source]?.onSelectorStateChanged(isActive)
        var parent: ViewParent? = source.parent
        while (parent != null) {
            if (parent is View) {
                activeCallbacks[parent]?.onSelectorStateChanged(isActive)
            }
            parent = parent.parent
        }
    }

    /**
     * Recompute every registered view's _:hover_ state from the pointer position, firing only on
     * change. A view is hovered while the point is in its on-screen bounds - true for an ancestor
     * while the pointer is over a descendant. Uses live (mid-animation) `getLocationOnScreen` bounds.
     */
    private fun updateHoverStates(
        rawX: Float,
        rawY: Float,
    ) {
        val loc = hoverLocationBuffer
        for ((view, callback) in hoverCallbacks) {
            view.getLocationOnScreen(loc)
            val contains =
                rawX >= loc[0] && rawX <= loc[0] + view.width &&
                    rawY >= loc[1] && rawY <= loc[1] + view.height
            val wasHovered = hoveredViews.contains(view)
            if (contains && !wasHovered) {
                hoveredViews.add(view)
                callback.onSelectorStateChanged(true)
            } else if (!contains && wasHovered) {
                hoveredViews.remove(view)
                callback.onSelectorStateChanged(false)
            }
        }
    }

    private fun isDescendantOf(
        view: View,
        ancestor: View,
    ): Boolean {
        var parent: ViewParent? = view.parent
        while (parent != null) {
            if (parent === ancestor) return true
            parent = (parent as? View)?.parent
        }
        return false
    }
}
