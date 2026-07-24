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

    private fun windowPressDown(event: MotionEvent) {
        if (activeCallbacks.isEmpty() && deepestCallbacks.isEmpty()) {
            return
        }
        for (host in pressHosts()) {
            if (gestureByHost.containsKey(host) || !viewContainsScreenPoint(host, event.rawX, event.rawY)) {
                continue
            }
            val leaf = findTouchedLeaf(host, event.rawX, event.rawY) ?: continue
            beginPress(host, leaf, event.rawX, event.rawY)
        }
    }

    private fun beginPress(
        host: View,
        leaf: View,
        rawX: Float,
        rawY: Float,
    ) {
        gestureByHost[host] = HostGesture(leaf, rawX, rawY)
        fireActiveCallbacksUpTree(leaf, true)
        fireDeepestIfHit(leaf, rawX, rawY)
    }

    private fun pressHosts(): Set<View> {
        val hosts = LinkedHashSet<View>()
        activeCallbacks.keys.forEach { hosts.add(findTouchHost(it)) }
        deepestCallbacks.keys.forEach { hosts.add(findTouchHost(it)) }
        return hosts
    }

    private fun viewContainsScreenPoint(
        view: View,
        rawX: Float,
        rawY: Float,
    ): Boolean {
        val loc = IntArray(2)
        view.getLocationOnScreen(loc)
        return rawX >= loc[0] && rawX <= loc[0] + view.width && rawY >= loc[1] && rawY <= loc[1] + view.height
    }

    private fun findTouchedLeaf(
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

    private fun onHostTouch(
        host: View,
        event: MotionEvent,
    ): Boolean {
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
        findTouchedLeaf(host, event.rawX, event.rawY)?.let {
            beginPress(host, it, event.rawX, event.rawY)
        }
        hover.onViewTouchDown(host, event)
    }

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

    fun invalidate() {
        UiThreadUtil.runOnUiThread {
            if (mountListenerRegistered) {
                fabricUIManager.removeUIManagerEventListener(mountListener)
                mountListenerRegistered = false
            }
            extraWindowBridge?.uninstall()
            extraWindowBridge = null
        }
    }

    private fun hasDeepestDescendantAt(
        ancestor: View,
        rawX: Float,
        rawY: Float,
    ): Boolean {
        if (deepestCallbacks.size < 2) {
            return false
        }
        // TODO: Optimize so we don't iterate over all the views with :active-deepest every time.
        for (candidate in deepestCallbacks.keys) {
            if (candidate === ancestor) continue
            if (!isDescendantOf(candidate, ancestor)) continue
            if (viewContainsScreenPoint(candidate, rawX, rawY)) {
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
