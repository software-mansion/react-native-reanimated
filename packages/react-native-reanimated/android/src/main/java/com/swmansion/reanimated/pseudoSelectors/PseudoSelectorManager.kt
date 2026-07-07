package com.swmansion.reanimated.pseudoSelectors

import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewParent
import android.view.ViewTreeObserver
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
    // Keyed by "$tag:$selector" so a view can register several selectors.
    private val detachActions = HashMap<String, Runnable>()

    private val activeCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val deepestCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()

    private val touchHostRefs = HashMap<View, Int>()
    private val gestureByHost = HashMap<View, HostGesture>()

    private val hover = TouchHoverCoordinator()
    private var extraWindowBridge: ExtraWindowObserverBridge? = null

    private val pendingAttaches = LinkedHashMap<String, PendingAttach>()
    private var mountListenerRegistered = false
    private var pressWindowInterceptorSet = false

    private data class PendingAttach(
        val tag: Int,
        val selector: Int,
        val callback: PseudoSelectorCallback,
    )

    private class HostGesture(
        val leaf: View,
        val downX: Float,
        val downY: Float,
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
            0 -> attachFocusListener(view, key, callback) { view.hasFocus() }
            1 -> attachFocusListener(view, key, callback) { it === view }
            2 -> attachHover(view, key, callback)
            3 -> attachPressSelector(view, key, callback, activeCallbacks)
            4 -> attachPressSelector(view, key, callback, deepestCallbacks)
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

    private fun attachFocusListener(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
        isFocused: (newFocus: View?) -> Boolean,
    ) {
        var focused = false
        val listener =
            ViewTreeObserver.OnGlobalFocusChangeListener { _, newFocus ->
                val nowFocused = isFocused(newFocus)
                if (nowFocused != focused) {
                    focused = nowFocused
                    callback.onSelectorStateChanged(nowFocused)
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
        hover.register(view, host, callback)
        ensureExtraWindowBridge()
        detachActions[key] =
            Runnable {
                hover.unregister(view, host)
                releaseTouchListener(host)
            }
    }

    private fun ensureExtraWindowBridge() {
        if (!BuildConfig.IS_REACT_NATIVE_86_OR_NEWER || extraWindowBridge != null) {
            return
        }
        val context = reactContext.get() ?: return
        extraWindowBridge = ExtraWindowObserverBridge(context, hover).also { it.install() }
    }

    private fun attachPressSelector(
        view: View,
        key: String,
        callback: PseudoSelectorCallback,
        callbacks: MutableMap<View, PseudoSelectorCallback>,
    ) {
        val host = findTouchHost(view)
        callbacks[view] = callback
        acquireTouchListener(host)
        // A compound host (e.g. SvgView) delivers ACTION_DOWN to a per-view listener but not the following
        // MOVE/UP, so :active would set on press yet never clear. The window observer sees every event on
        // the window and drives the slop-dismiss/release below, the same way it makes :hover work on svg.
        hover.retainWindowObserver(view)
        ensureExtraWindowBridge()
        ensurePressWindowInterceptor()
        detachActions[key] =
            Runnable {
                callbacks.remove(view)
                releaseTouchListener(host)
                hover.releaseWindowObserver()
            }
    }

    private fun ensurePressWindowInterceptor() {
        if (pressWindowInterceptorSet) {
            return
        }
        pressWindowInterceptorSet = true
        hover.setWindowTouchInterceptor(::onWindowPressTouch)
    }

    // The hover coordinator's per-window observer feeds every touch here. It is the reliable source for the
    // whole press: a compound host such as an SvgView intermittently never delivers the down (nor the
    // following events) to its per-view listener on a real finger, whereas the window observer sees them all.
    private fun onWindowPressTouch(event: MotionEvent) {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> windowPressDown(event)
            MotionEvent.ACTION_MOVE ->
                if (event.findPointerIndex(0) >= 0) {
                    for (host in gestureByHost.keys.toList()) {
                        onHostMove(host, event)
                    }
                }
            MotionEvent.ACTION_UP ->
                if (event.findPointerIndex(0) >= 0) {
                    releaseAllHostGestures()
                }
            MotionEvent.ACTION_POINTER_UP ->
                if (event.getPointerId(event.actionIndex) == 0) {
                    releaseAllHostGestures()
                }
            MotionEvent.ACTION_CANCEL ->
                releaseAllHostGestures()
        }
    }

    // Seed the press from the window-level down by hit-testing the registered hosts geometrically.
    // reactTagForTouch is a geometric resolve that (unlike the per-view listener) does not depend on the
    // touch being delivered to the compound host, so the :active set is reliable on a real finger.
    private fun windowPressDown(event: MotionEvent) {
        if (activeCallbacks.isEmpty() && deepestCallbacks.isEmpty()) {
            return
        }
        for (host in pressHosts()) {
            if (gestureByHost.containsKey(host) || !hostContainsScreen(host, event.rawX, event.rawY)) {
                continue
            }
            val leaf = findTouchedLeafOnScreen(host, event.rawX, event.rawY) ?: continue
            gestureByHost[host] = HostGesture(leaf, event.rawX, event.rawY)
            fireActiveCallbacksUpTree(leaf, true)
            fireDeepestIfHit(leaf, event.rawX, event.rawY)
        }
    }

    private fun pressHosts(): Set<View> {
        val hosts = LinkedHashSet<View>()
        activeCallbacks.keys.forEach { hosts.add(findTouchHost(it)) }
        deepestCallbacks.keys.forEach { hosts.add(findTouchHost(it)) }
        return hosts
    }

    private fun hostContainsScreen(
        host: View,
        rawX: Float,
        rawY: Float,
    ): Boolean {
        val loc = IntArray(2)
        host.getLocationOnScreen(loc)
        return rawX >= loc[0] && rawX < loc[0] + host.width && rawY >= loc[1] && rawY < loc[1] + host.height
    }

    // Like [findTouchedLeaf] but from screen coordinates, since the window observer's event is
    // window-relative; reactTagForTouch needs host-local coordinates.
    private fun findTouchedLeafOnScreen(
        host: View,
        rawX: Float,
        rawY: Float,
    ): View? =
        if (host is ReactCompoundView) {
            val loc = IntArray(2)
            host.getLocationOnScreen(loc)
            tryResolveView(host.reactTagForTouch(rawX - loc[0], rawY - loc[1]))
        } else {
            host
        }

    private fun releaseAllHostGestures() {
        for (host in gestureByHost.keys.toList()) {
            onHostRelease(host)
        }
    }

    // The nearest ReactCompoundView ancestor (e.g. SvgView) that owns [view]'s touches, else [view].
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
        gestureByHost.remove(host)
        host.setOnTouchListener(null)
    }

    // Only the first finger (pointer id 0) drives the press selectors, like the web's single active pointer.
    private fun onHostTouch(
        host: View,
        event: MotionEvent,
    ): Boolean {
        // Once a window observer is installed it owns the whole press for that window: it hit-tests the down
        // (reliable even when a compound host such as an SvgView never delivers the down to this per-view
        // listener on a real finger) and drives slop-dismiss/release from the real OS stream. The per-view
        // listener is only the pre-0.86 / unobserved-window (Modal/Dialog) fallback.
        if (hover.isWindowObserved(host)) {
            return false
        }
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
            gestureByHost[host] = HostGesture(it, event.rawX, event.rawY)
            fireActiveCallbacksUpTree(it, true)
            fireDeepestIfHit(it, event.rawX, event.rawY)
        }
        hover.onViewTouchDown(host, event)
    }

    // Past the touch slop the press is a scroll/drag, not a tap, so drop :active (web parity).
    private fun onHostMove(
        host: View,
        event: MotionEvent,
    ) {
        val gesture = gestureByHost[host] ?: return
        val dx = event.rawX - gesture.downX
        val dy = event.rawY - gesture.downY
        val slop = ViewConfiguration.get(host.context).scaledTouchSlop.toFloat()
        if (dx * dx + dy * dy > slop * slop) {
            onHostRelease(host)
        }
    }

    private fun onHostRelease(host: View) {
        val leaf = gestureByHost.remove(host)?.leaf ?: return
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

    // A pressed ancestor yields its :active-deepest to a deeper registered view covering the same point.
    private fun hasDeepestDescendantAt(
        ancestor: View,
        rawX: Float,
        rawY: Float,
    ): Boolean {
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
