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

    fun attach(
        tag: Int,
        selector: Int,
        callback: PseudoSelectorCallback,
    ) {
        UiThreadUtil.runOnUiThread {
            val view = fabricUIManager.resolveView(tag) ?: return@runOnUiThread
            val key = "$tag:$selector"
            when (selector) {
                0 -> { // :focus-within
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
                1 -> { // :focus
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
                2 -> { // :hover
                    val listener =
                        View.OnHoverListener { _, event ->
                            val action = event.actionMasked
                            if (action == MotionEvent.ACTION_HOVER_ENTER) {
                                callback.onSelectorStateChanged(true)
                            } else if (action == MotionEvent.ACTION_HOVER_EXIT) {
                                callback.onSelectorStateChanged(false)
                            }
                            false
                        }
                    view.setOnHoverListener(listener)
                    detachActions[key] = Runnable { view.setOnHoverListener(null) }
                }
                3 -> { // :active
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
                4 -> { // :active-deepest
                    activeDeepestViews.add(view)
                    val listener =
                        View.OnTouchListener { _, event ->
                            val action = event.actionMasked
                            if (action == MotionEvent.ACTION_DOWN) {
                                if (!hasDeepestDescendantAt(view, event.rawX, event.rawY)) {
                                    callback.onSelectorStateChanged(true)
                                }
                                // Propagate up so :active ancestors activate
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
            }
        }
    }

    fun detach(
        tag: Int,
        selector: Int,
    ) {
        UiThreadUtil.runOnUiThread { detachActions.remove("$tag:$selector")?.run() }
    }

    /**
     * Returns true if any view in activeDeepestViews is a strict descendant of [ancestor]
     * and contains the screen point ([rawX], [rawY]).
     * Used by :active-deepest to yield priority to deeper registered views.
     */
    private fun hasDeepestDescendantAt(
        ancestor: View,
        rawX: Float,
        rawY: Float,
    ): Boolean {
        val loc = IntArray(2)
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
     * the callback for every ancestor that has :active registered.
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
