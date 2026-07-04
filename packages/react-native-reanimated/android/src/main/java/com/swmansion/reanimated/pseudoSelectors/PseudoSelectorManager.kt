package com.swmansion.reanimated.pseudoSelectors

import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewParent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.ReactCompoundView
import com.swmansion.reanimated.BuildConfig
import com.swmansion.reanimated.nativeProxy.PseudoSelectorCallback
import java.lang.ref.WeakReference

@OptIn(UnstableReactNativeAPI::class)
class PseudoSelectorManager(
    private val fabricUIManager: FabricUIManager,
    private val reactContext: WeakReference<ReactApplicationContext>,
) {
    // Key = "$tag:$selector" - allows multiple selectors per view.
    private val detachActions = HashMap<String, Runnable>()

    private val activeCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val deepestCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()

    // A touch host can be shared by several registered views, so its listener is reference-counted.
    private val touchHostRefs = HashMap<View, Int>()

    // The view the current gesture went down on, per host, so a release clears the same one.
    private val gestureDownLeaf = HashMap<View, View>()

    // Window-space down point [rawX, rawY] per host, to measure how far the press has travelled.
    private val gestureDownPoint = HashMap<View, FloatArray>()

    private val hover = TouchHoverCoordinator()

    // RN >= 0.86 only: bridges Modal/Dialog windows into the hover coordinator so blank-space touches
    // inside a modal clear :hover (parity with iOS). Installed lazily on the first :hover registration.
    private var extraWindowBridge: ExtraWindowObserverBridge? = null

    private val pendingAttaches = LinkedHashMap<String, PendingAttach>()
    private var mountListenerRegistered = false

    private data class PendingAttach(
        val tag: Int,
        val selector: Int,
        val callback: PseudoSelectorCallback,
    )

    private val mountListener =
        object : UIManagerListener {
            override fun didMountItems(uiManager: UIManager) = flushPendingAttaches()

            override fun willMountItems(uiManager: UIManager) = Unit

            override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

            override fun didDispatchMountItems(uiManager: UIManager) = Unit

            override fun didScheduleMountItems(uiManager: UIManager) = Unit
        }

    fun attach(
        tag: Int,
        selector: Int,
        callback: PseudoSelectorCallback,
    ) {
        UiThreadUtil.runOnUiThread {
            val view = tryResolveView(tag)
            if (view != null) {
                attachToView(view, tag, selector, callback)
            } else {
                pendingAttaches["$tag:$selector"] = PendingAttach(tag, selector, callback)
                ensureMountListener()
            }
        }
    }

    private fun attachToView(
        view: View,
        tag: Int,
        selector: Int,
        callback: PseudoSelectorCallback,
    ) {
        val key = "$tag:$selector"
        when (selector) {
            0 -> attachFocusWithin(view, key, callback)
            1 -> attachFocus(view, key, callback)
            2 -> attachHover(view, key, callback)
            3 -> attachActive(view, key, callback)
            4 -> attachActiveDeepest(view, key, callback)
        }
    }

    private fun tryResolveView(tag: Int): View? =
        try {
            fabricUIManager.resolveView(tag)
        } catch (e: IllegalViewOperationException) {
            null
        }

    private fun ensureMountListener() {
        if (mountListenerRegistered) {
            return
        }
        mountListenerRegistered = true
        fabricUIManager.addUIManagerEventListener(mountListener)
    }

    private fun flushPendingAttaches() {
        if (pendingAttaches.isEmpty()) {
            return
        }
        val iterator = pendingAttaches.values.iterator()
        while (iterator.hasNext()) {
            val pending = iterator.next()
            val view = tryResolveView(pending.tag) ?: continue
            iterator.remove()
            attachToView(view, pending.tag, pending.selector, pending.callback)
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
        val host = findTouchHost(view)
        acquireTouchListener(host)
        hover.register(view, callback)
        ensureExtraWindowBridge()
        detachActions[key] =
            Runnable {
                hover.unregister(view)
                releaseTouchListener(host)
            }
    }

    // Installs the RN >= 0.86 Modal/Dialog window bridge once, on the first :hover registration.
    private fun ensureExtraWindowBridge() {
        if (!BuildConfig.IS_REACT_NATIVE_86_OR_NEWER || extraWindowBridge != null) {
            return
        }
        val context = reactContext.get() ?: return
        extraWindowBridge = ExtraWindowObserverBridge(context, hover).also { it.install() }
    }

    private fun attachActive(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        val host = findTouchHost(view)
        activeCallbacks[view] = callback
        acquireTouchListener(host)
        detachActions[key] =
            Runnable {
                activeCallbacks.remove(view)
                releaseTouchListener(host)
            }
    }

    private fun attachActiveDeepest(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
    ) {
        val host = findTouchHost(view)
        deepestCallbacks[view] = callback
        acquireTouchListener(host)
        detachActions[key] =
            Runnable {
                deepestCallbacks.remove(view)
                releaseTouchListener(host)
            }
    }

    /** The view that receives [view]'s touches: itself, or its nearest ReactCompoundView ancestor (e.g. SvgView). */
    private fun findTouchHost(view: View): View {
        var parent: ViewParent? = view.parent
        while (parent is View) {
            if (parent is ReactCompoundView) {
                return parent
            }
            parent = parent.parent
        }
        return view
    }

    /** The view pressed at [event]: a compound host's hit-tested virtual child, else the host itself. */
    private fun findTouchedLeaf(
        host: View,
        event: MotionEvent,
    ): View? =
        if (host is ReactCompoundView) {
            tryResolveView(host.reactTagForTouch(event.x, event.y))
        } else {
            host
        }

    private fun acquireTouchListener(host: View) {
        val count = touchHostRefs.getOrDefault(host, 0)
        touchHostRefs[host] = count + 1
        if (count == 0) {
            host.setOnTouchListener { _, event -> onHostTouch(host, event) }
        }
    }

    private fun releaseTouchListener(host: View) {
        val count = touchHostRefs.getOrDefault(host, 0)
        if (count > 1) {
            touchHostRefs[host] = count - 1
            return
        }
        touchHostRefs.remove(host)
        gestureDownLeaf.remove(host)
        gestureDownPoint.remove(host)
        host.setOnTouchListener(null)
    }

    // Only the first finger (pointer id 0) drives the press selectors, matching the web's single
    // active pointer; its release can arrive as the last-finger up or early via a pointer-up while
    // other fingers stay down.
    private fun onHostTouch(
        host: View,
        event: MotionEvent,
    ): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN ->
                if (!hover.isGestureSettled(event)) {
                    onHostDown(host, event)
                }
            MotionEvent.ACTION_MOVE ->
                if (event.findPointerIndex(0) >= 0) {
                    onHostMove(host, event)
                }
            MotionEvent.ACTION_POINTER_UP ->
                if (event.getPointerId(event.actionIndex) == 0) {
                    onHostRelease(host)
                    hover.onViewTouchUp(host, event)
                }
            MotionEvent.ACTION_UP ->
                if (event.findPointerIndex(0) >= 0) {
                    onHostRelease(host)
                    hover.onViewTouchUp(host, event)
                }
            MotionEvent.ACTION_CANCEL ->
                if (event.findPointerIndex(0) >= 0) {
                    onHostRelease(host)
                    hover.onViewTouchCancel(host, event)
                }
        }
        return false
    }

    private fun onHostDown(
        host: View,
        event: MotionEvent,
    ) {
        findTouchedLeaf(host, event)?.let {
            gestureDownLeaf[host] = it
            gestureDownPoint[host] = floatArrayOf(event.rawX, event.rawY)
            fireActiveCallbacksUpTree(it, true)
            fireDeepestIfHit(it, event.rawX, event.rawY)
        }
        hover.onViewTouchDown(host, event)
    }

    // Past the touch slop the press is a scroll/drag, not a tap, so drop `:active` (web parity). A scroll
    // container also cancels the gesture, but this covers a drag with nothing to intercept it.
    private fun onHostMove(
        host: View,
        event: MotionEvent,
    ) {
        val down = gestureDownPoint[host] ?: return
        val dx = event.rawX - down[0]
        val dy = event.rawY - down[1]
        val slop = ViewConfiguration.get(host.context).scaledTouchSlop.toFloat()
        if (dx * dx + dy * dy > slop * slop) {
            onHostRelease(host)
        }
    }

    private fun onHostRelease(host: View) {
        gestureDownPoint.remove(host)
        val leaf = gestureDownLeaf.remove(host) ?: return
        fireActiveCallbacksUpTree(leaf, false)
        deepestCallbacks[leaf]?.onSelectorStateChanged(false)
    }

    private fun fireDeepestIfHit(
        leaf: View,
        rawX: Float,
        rawY: Float,
    ) {
        val deepest = deepestCallbacks[leaf] ?: return
        if (!hasDeepestDescendantAt(leaf, rawX, rawY)) {
            deepest.onSelectorStateChanged(true)
        }
    }

    fun detach(
        tag: Int,
        selector: Int,
    ) {
        UiThreadUtil.runOnUiThread {
            val key = "$tag:$selector"
            pendingAttaches.remove(key)
            detachActions.remove(key)?.run()
        }
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

    /** Fires the callback for [source] and every ancestor registered for _:active_. */
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
