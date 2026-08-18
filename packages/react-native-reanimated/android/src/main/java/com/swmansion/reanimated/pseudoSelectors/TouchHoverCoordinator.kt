package com.swmansion.reanimated.pseudoSelectors

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.Window
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.TouchTargetHelper
import com.swmansion.reanimated.nativeProxy.PseudoSelectorCallback
import java.lang.ref.WeakReference

class TouchHoverCoordinator(
    private val onWindowTouch: (ViewGroup?, MotionEvent) -> Unit = { _, _ -> },
) {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val hoveredViews = LinkedHashSet<View>()
    private val hoverHostRefs = HashMap<View, Int>()
    private val tmpLocation = IntArray(2)
    private val tmpCoords = FloatArray(2)

    private var settledGestureDownTime = Long.MIN_VALUE

    private val observedWindows = mutableListOf<WeakReference<WindowObserver>>()

    private var windowObserverRetainCount = 0

    private inner class WindowObserver(
        window: Window,
        val original: Window.Callback,
        val isExtra: Boolean,
    ) : Window.Callback by original {
        val windowRef = WeakReference(window)
        private val downPoint = FloatArray(2)

        override fun dispatchTouchEvent(event: MotionEvent): Boolean {
            val root = windowRef.get()?.decorView as? ViewGroup
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downPoint[0] = event.rawX
                    downPoint[1] = event.rawY
                    reconcile(root, event.rawX, event.rawY)
                }
                MotionEvent.ACTION_UP ->
                    if (event.findPointerIndex(0) >= 0) settleHover(root, event, downPoint)
                MotionEvent.ACTION_POINTER_UP ->
                    if (event.getPointerId(event.actionIndex) == 0) settleHover(root, event, downPoint)
            }
            onWindowTouch(root, event)
            return original.dispatchTouchEvent(event)
        }
    }

    fun register(
        view: View,
        host: View,
        callback: PseudoSelectorCallback,
    ) {
        hoverCallbacks[view] = callback
        acquireHoverListener(host)
        retainWindowObserver(view)
    }

    fun unregister(
        view: View,
        host: View,
    ) {
        val callback = hoverCallbacks.remove(view)
        if (hoveredViews.remove(view)) {
            callback?.onSelectorStateChanged(false)
        }
        releaseHoverListener(host)
        releaseWindowObserver()
    }

    // Extra windows are dropped here too, unlike removeActivityWindowObservers. Nothing is
    // notified: onSelectorStateChanged calls into C++, which is being torn down concurrently.
    fun uninstall() {
        windowObserverRetainCount = 0
        observedWindows.forEach { reference -> reference.get()?.let { restoreCallback(it) } }
        observedWindows.clear()
        hoverHostRefs.keys.forEach { it.setOnHoverListener(null) }
        hoverHostRefs.clear()
        hoverCallbacks.clear()
        hoveredViews.clear()
    }

    fun retainWindowObserver(view: View) {
        windowObserverRetainCount++
        ensureWindowObserver(view)
    }

    fun releaseWindowObserver() {
        if (windowObserverRetainCount == 0) {
            return
        }
        windowObserverRetainCount--
        if (windowObserverRetainCount == 0) {
            removeActivityWindowObservers()
        }
    }

    private fun acquireHoverListener(host: View) {
        val count = hoverHostRefs.getOrDefault(host, 0)
        hoverHostRefs[host] = count + 1
        if (count == 0) {
            host.setOnHoverListener { _, event ->
                when (event.actionMasked) {
                    MotionEvent.ACTION_HOVER_ENTER,
                    MotionEvent.ACTION_HOVER_MOVE,
                    -> recompute(host, event.rawX, event.rawY)
                    MotionEvent.ACTION_HOVER_EXIT -> clearAll()
                }
                false
            }
        }
    }

    private fun releaseHoverListener(host: View) {
        val count = hoverHostRefs.getOrDefault(host, 0)
        if (count > 1) {
            hoverHostRefs[host] = count - 1
            return
        }
        hoverHostRefs.remove(host)
        host.setOnHoverListener(null)
    }

    fun observeExtraWindow(window: Window) {
        installObserverOnWindow(window, isExtra = true)
    }

    fun stopObservingExtraWindow(window: Window) {
        removeObserverFromWindow(window)
        clearHoverForWindow(window)
    }

    fun recompute(
        sourceView: View,
        screenX: Float,
        screenY: Float,
    ) {
        reconcile(sourceView.rootView as? ViewGroup, screenX, screenY)
    }

    private fun movedBeyondSlop(
        root: ViewGroup?,
        dx: Float,
        dy: Float,
    ): Boolean {
        val context = root?.context ?: hoverCallbacks.keys.firstOrNull()?.context ?: return true
        val slop = ViewConfiguration.get(context).scaledTouchSlop.toFloat()
        return dx * dx + dy * dy > slop * slop
    }

    fun onViewTouchUp(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (isWindowObserved(sourceView)) {
            return
        }
        settleHover(sourceView.rootView as? ViewGroup, event, null)
    }

    fun onViewTouchCancel(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (isWindowObserved(sourceView) || isGestureSettled(event)) {
            return
        }
        settledGestureDownTime = event.downTime
        clearAll()
    }

    fun isGestureSettled(event: MotionEvent) = event.downTime == settledGestureDownTime

    private fun reconcile(
        root: ViewGroup?,
        screenX: Float,
        screenY: Float,
    ) {
        if (hoverCallbacks.isEmpty()) {
            return
        }
        val hitTags: List<Int> = if (root == null) emptyList() else hitTestPath(root, screenX, screenY)
        for ((view, callback) in hoverCallbacks) {
            setHovered(view, callback, view.id in hitTags)
        }
    }

    private fun settleHover(
        root: ViewGroup?,
        event: MotionEvent,
        downPoint: FloatArray?,
    ) {
        if (isGestureSettled(event)) {
            return
        }
        settledGestureDownTime = event.downTime
        val index = event.findPointerIndex(0)
        if (index < 0 || hoveredViews.isEmpty()) {
            return
        }
        val screenX = event.getX(index) + (event.rawX - event.getX(0))
        val screenY = event.getY(index) + (event.rawY - event.getY(0))
        if (downPoint != null &&
            !movedBeyondSlop(root, screenX - downPoint[0], screenY - downPoint[1])
        ) {
            return
        }
        val hitTags: List<Int> = if (root == null) emptyList() else hitTestPath(root, screenX, screenY)
        unhoverWhere { it.id !in hitTags }
    }

    private fun hitTestPath(
        root: ViewGroup,
        screenX: Float,
        screenY: Float,
    ): List<Int> {
        root.getLocationOnScreen(tmpLocation)
        val localX = screenX - tmpLocation[0]
        val localY = screenY - tmpLocation[1]
        val targets =
            TouchTargetHelper.findTargetPathAndCoordinatesForTouch(localX, localY, root, tmpCoords)
        return targets.map { it.getViewId() }
    }

    // Ordered target first, with compound (SVG) children resolved to the touched shape.
    fun hitTestTagsAt(
        view: View,
        screenX: Float,
        screenY: Float,
    ): List<Int> {
        val root = view.rootView as? ViewGroup ?: return emptyList()
        return hitTestPath(root, screenX, screenY)
    }

    private inline fun unhoverWhere(predicate: (View) -> Boolean) {
        for (view in hoveredViews.toList()) {
            if (predicate(view)) {
                hoverCallbacks[view]?.let { setHovered(view, it, false) }
            }
        }
    }

    private fun clearAll() {
        unhoverWhere { true }
    }

    private fun clearHoverForWindow(window: Window) {
        val decor = window.decorView
        unhoverWhere { it.rootView === decor }
    }

    private fun setHovered(
        view: View,
        callback: PseudoSelectorCallback,
        hovered: Boolean,
    ) {
        if ((view in hoveredViews) == hovered) {
            return
        }
        if (hovered) hoveredViews.add(view) else hoveredViews.remove(view)
        callback.onSelectorStateChanged(hovered)
    }

    private fun WeakReference<WindowObserver>.liveWindow(): Window? = get()?.windowRef?.get()

    private fun ensureWindowObserver(view: View) {
        val window = view.activityWindow() ?: return
        installObserverOnWindow(window, isExtra = false)
    }

    private fun installObserverOnWindow(
        window: Window,
        isExtra: Boolean,
    ) {
        observedWindows.removeAll { it.liveWindow() == null }
        if (observedWindows.any { it.liveWindow() === window }) {
            return
        }
        val original = window.callback ?: return
        val observer = WindowObserver(window, original, isExtra)
        observedWindows.add(WeakReference(observer))
        window.callback = observer
    }

    private fun removeObserverFromWindow(window: Window) {
        val iterator = observedWindows.iterator()
        while (iterator.hasNext()) {
            val observer = iterator.next().get()
            if (observer == null) {
                iterator.remove()
                continue
            }
            if (observer.windowRef.get() === window) {
                restoreCallback(observer)
                iterator.remove()
            }
        }
    }

    // The bridge reports each Dialog once and never re-adds it, so only the activity window is
    // dropped when the last registration goes away.
    private fun removeActivityWindowObservers() {
        observedWindows.removeAll { reference ->
            val observer = reference.get()
            when {
                observer == null -> true
                observer.isExtra -> false
                else -> {
                    restoreCallback(observer)
                    true
                }
            }
        }
        clearAll()
    }

    private fun restoreCallback(observer: WindowObserver) {
        val window = observer.windowRef.get() ?: return
        if (window.callback === observer) {
            window.callback = observer.original
        }
    }

    fun isWindowObserved(view: View): Boolean {
        val decor = view.rootView
        return observedWindows.any { it.liveWindow()?.decorView === decor }
    }

    private fun View.activityWindow(): Window? {
        var ctx: Context? = context
        while (ctx is ContextWrapper) {
            if (ctx is Activity) return ctx.window
            if (ctx is ReactContext) ctx.currentActivity?.let { return it.window }
            ctx = ctx.baseContext
        }
        return (context as? ReactContext)?.currentActivity?.window
    }
}
