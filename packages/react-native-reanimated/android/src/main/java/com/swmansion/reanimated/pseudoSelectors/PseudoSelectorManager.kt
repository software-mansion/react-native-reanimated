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
    private val deepestCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()

    private val touchListenerViews = HashSet<View>()

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
        // Android fires ACTION_HOVER_EXIT on an ancestor when the pointer moves onto a
        // hoverable descendant, but CSS :hover must stay active there. So on enter/exit
        // (not per-frame MOVE) recompute every registered view from the pointer position.
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
        ensureTouchListener(view)
        detachActions[key] =
            Runnable {
                activeCallbacks.remove(view)
                maybeRemoveTouchListener(view)
            }
    }

    private fun attachActiveDeepest(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        deepestCallbacks[view] = callback
        ensureTouchListener(view)
        detachActions[key] =
            Runnable {
                deepestCallbacks.remove(view)
                maybeRemoveTouchListener(view)
            }
    }

    private fun ensureTouchListener(view: View) {
        if (!touchListenerViews.add(view)) {
            return
        }
        view.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    fireActiveCallbacksUpTree(view, true)
                    deepestCallbacks[view]?.let {
                        if (!hasDeepestDescendantAt(view, event.rawX, event.rawY)) {
                            it.onSelectorStateChanged(true)
                        }
                    }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    fireActiveCallbacksUpTree(view, false)
                    deepestCallbacks[view]?.onSelectorStateChanged(false)
                }
            }
            false
        }
    }

    private fun maybeRemoveTouchListener(view: View) {
        if (view !in activeCallbacks && view !in deepestCallbacks) {
            touchListenerViews.remove(view)
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
     * Returns true if any view registered for _:active-deepest_ is a strict descendant of
     * `ancestor` and contains the screen point (`rawX`, `rawY`), so the ancestor yields priority
     * to the deeper view.
     */
    private fun hasDeepestDescendantAt(
        ancestor: View,
        rawX: Float,
        rawY: Float,
    ): Boolean {
        // With fewer than two registered views the only candidate is the ancestor itself.
        if (deepestCallbacks.size < 2) {
            return false
        }
        val loc = IntArray(2)
        // TODO: Optimize so we don't iterate over all the views with :active-deepest every time.
        for (candidate in deepestCallbacks.keys) {
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
