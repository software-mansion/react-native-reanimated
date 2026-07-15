package com.swmansion.reanimated.pseudoSelectors

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.Window
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.TouchTargetHelper
import com.swmansion.reanimated.nativeProxy.PseudoSelectorCallback
import java.lang.ref.WeakReference

class TouchHoverCoordinator {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val hoveredViews = LinkedHashSet<View>()
    private val tmpLocation = IntArray(2)
    private val tmpCoords = FloatArray(2)

    private var settledGestureDownTime = Long.MIN_VALUE

    private val observedWindows = mutableListOf<WeakReference<WindowObserver>>()

    private inner class WindowObserver(
        window: Window,
        val original: Window.Callback,
    ) : Window.Callback by original {
        val windowRef = WeakReference(window)

        override fun dispatchTouchEvent(event: MotionEvent): Boolean {
            val root = windowRef.get()?.decorView as? ViewGroup
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> reconcile(root, event.rawX, event.rawY)
                MotionEvent.ACTION_UP ->
                    if (event.findPointerIndex(0) >= 0) settleHover(root, event)
                MotionEvent.ACTION_POINTER_UP ->
                    if (event.getPointerId(event.actionIndex) == 0) settleHover(root, event)
            }
            return original.dispatchTouchEvent(event)
        }
    }

    fun register(
        view: View,
        callback: PseudoSelectorCallback,
    ) {
        view.setOnHoverListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_HOVER_ENTER,
                MotionEvent.ACTION_HOVER_EXIT,
                -> recompute(view, event.rawX, event.rawY)
            }
            false
        }
        hoverCallbacks[view] = callback
        ensureWindowObserver(view)
    }

    fun unregister(view: View) {
        view.setOnHoverListener(null)
        val callback = hoverCallbacks.remove(view)
        if (hoveredViews.remove(view)) {
            callback?.onSelectorStateChanged(false)
        }
        if (hoverCallbacks.isEmpty()) {
            removeAllWindowObservers()
        }
    }

    fun observeExtraWindow(window: Window) {
        installObserverOnWindow(window)
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

    fun onViewTouchDown(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (isWindowObserved(sourceView) || isGestureSettled(event)) {
            return
        }
        reconcile(sourceView.rootView as? ViewGroup, event.rawX, event.rawY)
    }

    fun onViewTouchUp(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (isWindowObserved(sourceView)) {
            return
        }
        settleHover(sourceView.rootView as? ViewGroup, event)
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
        val hitTags: Set<Int> = if (root == null) emptySet() else hitTestPath(root, screenX, screenY)
        for ((view, callback) in hoverCallbacks) {
            setHovered(view, callback, view.id in hitTags)
        }
    }

    private fun settleHover(
        root: ViewGroup?,
        event: MotionEvent,
    ) {
        if (event.downTime == settledGestureDownTime) {
            return
        }
        settledGestureDownTime = event.downTime
        val index = event.findPointerIndex(0)
        if (index < 0 || hoveredViews.isEmpty()) {
            return
        }
        val screenX = event.getX(index) + (event.rawX - event.getX(0))
        val screenY = event.getY(index) + (event.rawY - event.getY(0))
        val hitTags: Set<Int> = if (root == null) emptySet() else hitTestPath(root, screenX, screenY)
        for (view in hoveredViews.toList()) {
            if (view.id !in hitTags) {
                hoverCallbacks[view]?.let { setHovered(view, it, false) }
            }
        }
    }

    private fun hitTestPath(
        root: ViewGroup,
        screenX: Float,
        screenY: Float,
    ): Set<Int> {
        root.getLocationOnScreen(tmpLocation)
        val localX = screenX - tmpLocation[0]
        val localY = screenY - tmpLocation[1]
        val targets =
            TouchTargetHelper.findTargetPathAndCoordinatesForTouch(localX, localY, root, tmpCoords)
        return targets.mapTo(HashSet(targets.size)) { it.getViewId() }
    }

    private fun clearAll() {
        if (hoveredViews.isEmpty()) {
            return
        }
        for (view in hoveredViews.toList()) {
            hoverCallbacks[view]?.let { setHovered(view, it, false) }
        }
    }

    private fun clearHoverForWindow(window: Window) {
        if (hoveredViews.isEmpty()) {
            return
        }
        val decor = window.decorView
        for (view in hoveredViews.toList()) {
            if (view.rootView === decor) {
                hoverCallbacks[view]?.let { setHovered(view, it, false) }
            }
        }
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

    private fun ensureWindowObserver(view: View) {
        val window = view.activityWindow() ?: return
        installObserverOnWindow(window)
    }

    private fun installObserverOnWindow(window: Window) {
        pruneObservers()
        if (isObserving(window)) {
            return
        }
        val original = window.callback ?: return
        val observer = WindowObserver(window, original)
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
                if (window.callback === observer) {
                    window.callback = observer.original
                }
                iterator.remove()
            }
        }
    }

    private fun removeAllWindowObservers() {
        for (reference in observedWindows) {
            val observer = reference.get() ?: continue
            val window = observer.windowRef.get() ?: continue
            if (window.callback === observer) {
                window.callback = observer.original
            }
        }
        observedWindows.clear()
        clearAll()
    }

    private fun isObserving(window: Window) = observedWindows.any { it.get()?.windowRef?.get() === window }

    private fun isWindowObserved(view: View): Boolean {
        val decor = view.rootView
        return observedWindows.any {
            it
                .get()
                ?.windowRef
                ?.get()
                ?.decorView === decor
        }
    }

    private fun pruneObservers() {
        observedWindows.removeAll { it.get()?.windowRef?.get() == null }
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
