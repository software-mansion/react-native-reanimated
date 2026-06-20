package com.swmansion.reanimated.pseudoSelectors

import android.view.MotionEvent
import android.view.View
import android.view.ViewParent
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.ReactCompoundView
import com.swmansion.reanimated.nativeProxy.PseudoSelectorCallback

class PseudoSelectorManager(
    private val fabricUIManager: FabricUIManager,
) {
    // Key = "$tag:$selectorInt" - allows multiple selectors per view.
    private val detachActions = HashMap<String, Runnable>()

    private val activeCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()

    private val activeDeepestViews = LinkedHashSet<View>()

    // For "virtual" children that don't receive native touches themselves (e.g.
    // react-native-svg elements): the compound host view (the SvgView) -> map of
    // react tag -> (childView, callback). One touch listener per host dispatches
    // to the right child via `reactTagForTouch`.
    private val compoundActive = HashMap<View, HashMap<Int, Pair<View, PseudoSelectorCallback>>>()

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
                2 -> attachHoverWhenReady(tag, view, key, callback)
                3 -> attachActiveWhenReady(tag, view, key, callback)
                4 -> attachActiveDeepest(view, key, callback)
            }
        }
    }

    /**
     * Returns the nearest ancestor that owns touch handling for "virtual" children
     * (a [ReactCompoundView], e.g. react-native-svg's SvgView), or null when the
     * view receives touches itself. Virtual children such as RNSVGCircle are not
     * real touchable Android views, so a listener attached to them never fires.
     */
    private fun compoundTouchHost(view: View): View? {
        var parent: ViewParent? = view.parent
        while (parent != null) {
            if (parent is ReactCompoundView && parent is View) {
                return parent
            }
            parent = parent.parent
        }
        return null
    }

    /**
     * Routes _:active_ either to the compound host (for virtual SVG children) or to
     * the view itself. When the view has not yet been inserted into its host (which
     * is common at registration time, before the mounting layer attaches it), the
     * decision is deferred until the view attaches to the window so the host chain
     * is resolvable.
     */
    private fun attachActiveWhenReady(
        tag: Int,
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        whenHostResolvable(view, key) { host ->
            if (host != null) {
                attachActiveCompound(tag, view, host, key, callback)
            } else {
                attachActive(view, key, callback)
            }
        }
    }

    private fun attachHoverWhenReady(
        tag: Int,
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        whenHostResolvable(view, key) { host ->
            if (host != null) {
                attachHoverCompound(tag, view, host, key, callback)
            } else {
                attachHover(view, key, callback)
            }
        }
    }

    /**
     * Invokes [action] with the compound touch host once it can be resolved. If the
     * view is already attached, runs synchronously; otherwise waits for the view to
     * attach so a virtual child's host (the SvgView) is present in its parent chain.
     */
    private fun whenHostResolvable(
        view: View,
        key: String,
        action: (View?) -> Unit,
    ) {
        if (view.isAttachedToWindow) {
            action(compoundTouchHost(view))
            return
        }
        val listener =
            object : View.OnAttachStateChangeListener {
                override fun onViewAttachedToWindow(v: View) {
                    v.removeOnAttachStateChangeListener(this)
                    action(compoundTouchHost(v))
                }

                override fun onViewDetachedFromWindow(v: View) {}
            }
        view.addOnAttachStateChangeListener(listener)
        detachActions[key] = Runnable { view.removeOnAttachStateChangeListener(listener) }
    }

    /**
     * react-native-svg only resolves a touch to an individual shape once that shape is
     * marked "responsible" - normally the side effect of attaching a touch handler such
     * as `onStartShouldSetResponder`. A pseudo selector targets the shape directly, so we
     * set the flag ourselves through the public `setResponsible` hook and invalidate the
     * host to rebuild its hit-testing state. Reflection avoids a hard dependency on
     * react-native-svg; the call is a no-op for any other kind of compound child.
     */
    private fun enableCompoundHitTesting(
        host: View,
        child: View,
    ) {
        try {
            child.javaClass
                .getMethod("setResponsible", java.lang.Boolean.TYPE)
                .invoke(child, true)
            host.invalidate()
        } catch (e: Exception) {
        }
    }

    private fun attachActiveCompound(
        tag: Int,
        childView: View,
        host: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        // Keep the child in activeCallbacks so :active still propagates up the tree.
        activeCallbacks[childView] = callback
        enableCompoundHitTesting(host, childView)
        val byTag =
            compoundActive.getOrPut(host) {
                val map = HashMap<Int, Pair<View, PseudoSelectorCallback>>()
                host.setOnTouchListener(compoundActiveListener(host, map))
                map
            }
        byTag[tag] = childView to callback
        detachActions[key] =
            Runnable {
                activeCallbacks.remove(childView)
                byTag.remove(tag)
                if (byTag.isEmpty()) {
                    compoundActive.remove(host)
                    host.setOnTouchListener(null)
                }
            }
    }

    private fun compoundActiveListener(
        host: View,
        byTag: Map<Int, Pair<View, PseudoSelectorCallback>>,
    ): View.OnTouchListener {
        var activeChild: View? = null
        return View.OnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    val hitTag = (host as ReactCompoundView).reactTagForTouch(event.x, event.y)
                    val entry = byTag[hitTag]
                    if (entry != null) {
                        activeChild = entry.first
                        fireActiveCallbacksUpTree(entry.first, true)
                    }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    activeChild?.let { fireActiveCallbacksUpTree(it, false) }
                    activeChild = null
                }
            }
            false
        }
    }

    private fun attachHoverCompound(
        tag: Int,
        childView: View,
        host: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        var isHovered = false
        val listener =
            View.OnHoverListener { _, event ->
                val hitTag = (host as ReactCompoundView).reactTagForTouch(event.x, event.y)
                val over =
                    hitTag == tag &&
                        event.actionMasked != MotionEvent.ACTION_HOVER_EXIT
                if (over && !isHovered) {
                    isHovered = true
                    callback.onSelectorStateChanged(true)
                } else if (!over && isHovered) {
                    isHovered = false
                    callback.onSelectorStateChanged(false)
                }
                false
            }
        enableCompoundHitTesting(host, childView)
        host.setOnHoverListener(listener)
        detachActions[key] = Runnable { host.setOnHoverListener(null) }
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
