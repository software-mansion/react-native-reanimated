package com.swmansion.reanimated.pseudoSelectors

import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
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

    // Run on invalidation, unlike the rest: removing a focus listener is the only teardown action
    // that neither notifies C++ nor is already covered by the direct teardown.
    private val focusDetachActions = HashMap<String, Runnable>()

    private val activeCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val deepestCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()

    private val touchHostRefs = HashMap<View, Int>()
    private val gestureByHost = HashMap<View, HostGesture>()

    private val hover = TouchHoverCoordinator(::onWindowPressTouch)
    private var extraWindowBridge: ExtraWindowObserverBridge? = null

    init {
        // Dialog windows announce their creation only to listeners that already exist, so the
        // bridge must be listening before the first Modal can open. Installing it on the first
        // pseudo registration is too late for a registration that happens inside that Modal.
        UiThreadUtil.runOnUiThread {
            if (BuildConfig.IS_REACT_NATIVE_86_OR_NEWER) {
                reactContext.get()?.let { context ->
                    extraWindowBridge = ExtraWindowObserverBridge(context, hover).also { it.install() }
                }
            }
        }
    }

    private val pendingAttaches = LinkedHashMap<String, PendingAttach>()
    private var mountListenerRegistered = false

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
        focusDetachActions[key] =
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
        detachActions[key] =
            Runnable {
                hover.unregister(view, host)
                releaseTouchListener(host)
            }
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
        detachActions[key] =
            Runnable {
                callbacks.remove(view)
                releaseTouchListener(host)
                hover.releaseWindowObserver()
            }
    }

    private fun onWindowPressTouch(
        root: ViewGroup?,
        event: MotionEvent,
    ) {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> windowPressDown(root, event)
            MotionEvent.ACTION_MOVE -> gestureByHost.keys.toList().forEach { onHostMove(it, event) }
            // A secondary finger lifting does not end a press started by the primary one.
            MotionEvent.ACTION_POINTER_UP ->
                if (event.getPointerId(event.actionIndex) == 0) {
                    releaseAllHostGestures()
                }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> releaseAllHostGestures()
        }
    }

    private fun windowPressDown(
        root: ViewGroup?,
        event: MotionEvent,
    ) {
        if (root == null || (activeCallbacks.isEmpty() && deepestCallbacks.isEmpty())) {
            return
        }
        val hostsById = pressHostsById()
        val hitTags = hover.hitTestTagsAt(root, event.rawX, event.rawY)
        // Ordered target first, so the first host on the path is the deepest one.
        val host = hitTags.firstNotNullOfOrNull { hostsById[it] } ?: return
        if (gestureByHost.containsKey(host)) {
            return
        }
        val leaf = findTouchedLeaf(host, hitTags) ?: return
        beginPress(host, leaf, event.rawX, event.rawY, hitTags)
    }

    private fun beginPress(
        host: View,
        leaf: View,
        rawX: Float,
        rawY: Float,
        hitTags: List<Int>,
    ) {
        gestureByHost[host] = HostGesture(leaf, rawX, rawY)
        fireActiveCallbacksUpTree(leaf, true)
        fireDeepestIfHit(leaf, hitTags)
    }

    private fun pressHostsById(): Map<Int, View> =
        (activeCallbacks.keys + deepestCallbacks.keys).map { findTouchHost(it) }.associateBy { it.id }

    // Raw coordinates cannot be made host-local without the ancestors' transforms, which the
    // touch path has already applied when it resolved the compound child.
    private fun findTouchedLeaf(
        host: View,
        hitTags: List<Int>,
    ): View? =
        if (host is ReactCompoundView) {
            hitTags.firstOrNull()?.let { tryResolveView(it) }
        } else {
            host
        }

    private fun releaseAllHostGestures() = gestureByHost.keys.toList().forEach { onHostRelease(it) }

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
        // The press covers every ancestor, so dropping it silently when a descendant unmounts
        // mid-press would leave them all active with no event left to end it.
        onHostRelease(host)
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
        val hitTags = hover.hitTestTagsAt(host, event.rawX, event.rawY)
        findTouchedLeaf(host, hitTags)?.let {
            beginPress(host, it, event.rawX, event.rawY, hitTags)
        }
        hover.recompute(host, event.rawX, event.rawY)
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
        hitTags: List<Int>,
    ) {
        val deepest = deepestCallbacks[leaf] ?: return
        if (!hasDeepestDescendantAt(leaf, hitTags)) {
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
            focusDetachActions.remove(key)?.run()
            detachActions.remove(key)?.run()
        }
    }

    // The dev menu keeps this manager alive a generation past its own React context, so the views
    // and callbacks are dropped explicitly. Only the focus listeners can be detached properly;
    // the other actions notify C++ over JNI, which is being torn down concurrently.
    fun invalidate() {
        UiThreadUtil.runOnUiThread {
            fabricUIManager.removeUIManagerEventListener(mountListener)
            mountListenerRegistered = false
            extraWindowBridge?.uninstall()
            extraWindowBridge = null
            hover.uninstall()
            touchHostRefs.keys.forEach { it.setOnTouchListener(null) }
            touchHostRefs.clear()
            gestureByHost.clear()
            activeCallbacks.clear()
            deepestCallbacks.clear()
            pendingAttaches.clear()
            focusDetachActions.values.forEach { it.run() }
            focusDetachActions.clear()
            detachActions.clear()
        }
    }

    // TODO: Optimize so we don't iterate over all the views with :active-deepest every time.
    private fun hasDeepestDescendantAt(
        ancestor: View,
        hitTags: List<Int>,
    ): Boolean = deepestCallbacks.keys.any { it !== ancestor && it.id in hitTags && isDescendantOf(it, ancestor) }

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
