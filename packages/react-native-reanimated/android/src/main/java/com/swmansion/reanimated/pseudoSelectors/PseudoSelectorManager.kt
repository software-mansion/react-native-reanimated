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

    // "Virtual" children (react-native-svg shapes) get no native touches, so we listen on
    // their compound host: host -> tag -> entry, one listener routing presses via
    // `reactTagForTouch`. :active and :active-deepest share it (one OnTouchListener per host).
    private class CompoundActiveEntry(
        val child: View,
        val callback: PseudoSelectorCallback,
        val isDeepest: Boolean,
    )

    private val compoundActive = HashMap<View, HashMap<Int, CompoundActiveEntry>>()

    private val compoundHover = HashMap<View, HashMap<Int, Pair<View, PseudoSelectorCallback>>>()

    // A shape can carry several selectors (e.g. :active and :hover), each marking it
    // "responsible". Ref-count so detaching one doesn't unmark it while another needs it.
    private val responsibleRefCounts = HashMap<View, Int>()

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
                4 -> attachActiveDeepestWhenReady(tag, view, key, callback)
            }
        }
    }

    /**
     * Nearest [ReactCompoundView] ancestor (e.g. react-native-svg's SvgView) that owns
     * touch handling, or null if the view receives touches itself. Virtual children like
     * RNSVGCircle aren't touchable Android views, so a listener on them never fires.
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
     * Routes :active to the compound host (virtual SVG children) or the view itself.
     * At registration the view often isn't attached yet, so the choice is deferred
     * until it attaches and its host chain is resolvable.
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
     * Routes :active-deepest to the compound host (virtual SVG children) or the view itself,
     * deferring the choice until the view attaches and its host chain is resolvable.
     */
    private fun attachActiveDeepestWhenReady(
        tag: Int,
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        whenHostResolvable(view, key) { host ->
            if (host != null) {
                attachActiveDeepestCompound(tag, view, host, key, callback)
            } else {
                attachActiveDeepest(view, key, callback)
            }
        }
    }

    /**
     * Invokes [action] with the compound touch host once resolvable: synchronously if
     * the view is attached, otherwise after it attaches and its host is in the parent chain.
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
     * react-native-svg only hit-tests a shape once marked "responsible" (normally via
     * `onStartShouldSetResponder`, which a pseudo selector doesn't add), so we set it and
     * invalidate the host. Reflection avoids a hard rn-svg dependency; no-op for other hosts.
     */
    private fun enableCompoundHitTesting(
        host: View,
        child: View,
    ) {
        val count = responsibleRefCounts.getOrDefault(child, 0)
        responsibleRefCounts[child] = count + 1
        if (count > 0) {
            return
        }
        setChildResponsible(child, true)
        host.invalidate()
    }

    /**
     * Reverts [enableCompoundHitTesting]'s `setResponsible(true)` when the child's last selector
     * detaches; otherwise the shape stays touch-responsible forever, altering app hit-testing.
     * SvgView's `mResponsible` latch can't be cleared, so reverting the child is all we can undo.
     */
    private fun disableCompoundHitTesting(
        host: View,
        child: View,
    ) {
        val count = responsibleRefCounts.getOrDefault(child, 0)
        if (count <= 1) {
            responsibleRefCounts.remove(child)
            setChildResponsible(child, false)
            host.invalidate()
        } else {
            responsibleRefCounts[child] = count - 1
        }
    }

    private fun setChildResponsible(
        child: View,
        responsible: Boolean,
    ) {
        try {
            child.javaClass
                .getMethod("setResponsible", java.lang.Boolean.TYPE)
                .invoke(child, responsible)
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
        registerCompoundActiveEntry(tag, childView, host, key, callback, isDeepest = false)
    }

    private fun attachActiveDeepestCompound(
        tag: Int,
        childView: View,
        host: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        registerCompoundActiveEntry(tag, childView, host, key, callback, isDeepest = true)
    }

    private fun registerCompoundActiveEntry(
        tag: Int,
        childView: View,
        host: View,
        key: String,
        callback: PseudoSelectorCallback,
        isDeepest: Boolean,
    ) {
        // :active entries live in activeCallbacks (fired by fireActiveCallbacksUpTree); :active-deepest
        // entries fire their own callback explicitly and only propagate to ANCESTOR :active views, so
        // they stay out of activeCallbacks (mirrors the plain-view model; also avoids a double-fire).
        if (!isDeepest) {
            activeCallbacks[childView] = callback
        }
        enableCompoundHitTesting(host, childView)
        val byTag =
            compoundActive.getOrPut(host) {
                val map = HashMap<Int, CompoundActiveEntry>()
                host.setOnTouchListener(compoundActiveListener(host, map))
                map
            }
        // Keyed by tag: a shape carrying BOTH :active and :active-deepest keeps only the
        // last-registered entry. That combo is near-redundant, so it isn't supported.
        byTag[tag] = CompoundActiveEntry(childView, callback, isDeepest)
        detachActions[key] =
            Runnable {
                activeCallbacks.remove(childView)
                byTag.remove(tag)
                disableCompoundHitTesting(host, childView)
                if (byTag.isEmpty()) {
                    compoundActive.remove(host)
                    host.setOnTouchListener(null)
                }
            }
    }

    /**
     * One touch listener per host, shared by :active and :active-deepest. SvgView's
     * `reactTagForTouch` gives the deepest responsible shape under the point (per-path, z-order) -
     * the natural :active-deepest arbiter, no bounds needed. On DOWN: ancestor :active views light
     * up via [fireActiveCallbacksUpTree] from the hit shape, and the hit shape's :active-deepest
     * fires only if that shape is itself a deepest entry.
     */
    private fun compoundActiveListener(
        host: View,
        byTag: Map<Int, CompoundActiveEntry>,
    ): View.OnTouchListener {
        val compound = host as ReactCompoundView
        var activeChild: View? = null
        var deepestCallback: PseudoSelectorCallback? = null
        return View.OnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    val hitTag = compound.reactTagForTouch(event.x, event.y)
                    val entry = byTag[hitTag]
                    if (entry != null) {
                        activeChild = entry.child
                        fireActiveCallbacksUpTree(entry.child, true)
                        if (entry.isDeepest) {
                            deepestCallback = entry.callback
                            entry.callback.onSelectorStateChanged(true)
                        }
                    }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    activeChild?.let { fireActiveCallbacksUpTree(it, false) }
                    deepestCallback?.onSelectorStateChanged(false)
                    activeChild = null
                    deepestCallback = null
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
        enableCompoundHitTesting(host, childView)
        val byTag =
            compoundHover.getOrPut(host) {
                val map = HashMap<Int, Pair<View, PseudoSelectorCallback>>()
                host.setOnHoverListener(compoundHoverListener(host, map))
                map
            }
        byTag[tag] = childView to callback
        detachActions[key] =
            Runnable {
                byTag.remove(tag)
                disableCompoundHitTesting(host, childView)
                if (byTag.isEmpty()) {
                    compoundHover.remove(host)
                    host.setOnHoverListener(null)
                }
            }
    }

    private fun compoundHoverListener(
        host: View,
        byTag: Map<Int, Pair<View, PseudoSelectorCallback>>,
    ): View.OnHoverListener {
        val compound = host as ReactCompoundView
        var hoveredTag: Int? = null
        return View.OnHoverListener { _, event ->
            val hitTag =
                if (event.actionMasked == MotionEvent.ACTION_HOVER_EXIT) {
                    null
                } else {
                    compound.reactTagForTouch(event.x, event.y)
                }
            val newTag = if (hitTag != null && byTag.containsKey(hitTag)) hitTag else null
            if (newTag != hoveredTag) {
                hoveredTag?.let { byTag[it]?.second?.onSelectorStateChanged(false) }
                newTag?.let { byTag[it]?.second?.onSelectorStateChanged(true) }
                hoveredTag = newTag
            }
            false
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
     * True if any `activeDeepestViews` entry is a strict descendant of `ancestor` and
     * contains (`rawX`, `rawY`). Lets :active-deepest yield to deeper registered views.
     */
    private fun hasDeepestDescendantAt(
        ancestor: View,
        rawX: Float,
        rawY: Float,
    ): Boolean {
        val loc = IntArray(2)
        // TODO: O(n) per touch; also wrong for SVG (hit area is per-path, not view bounds).
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
     * Fire the callback for `source` and every ancestor that has :active registered.
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
