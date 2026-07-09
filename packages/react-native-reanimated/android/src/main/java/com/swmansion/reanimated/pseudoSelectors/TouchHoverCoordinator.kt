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

    private var observedGestureDownTime = Long.MIN_VALUE

    private var settledGestureDownTime = Long.MIN_VALUE

    private var observedWindow: WeakReference<Window>? = null
    private var originalWindowCallback: WeakReference<Window.Callback>? = null
    private var wrappedWindowCallback: WeakReference<Window.Callback>? = null

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
            removeWindowObserver()
        }
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
        if (event.downTime == observedGestureDownTime || isGestureSettled(event)) {
            return
        }
        reconcile(sourceView.rootView as? ViewGroup, event.rawX, event.rawY)
    }

    fun onViewTouchUp(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (event.downTime == observedGestureDownTime) {
            return
        }
        settleHover(sourceView.rootView as? ViewGroup, event)
    }

    fun onViewTouchCancel(event: MotionEvent) {
        if (event.downTime == observedGestureDownTime || isGestureSettled(event)) {
            return
        }
        settledGestureDownTime = event.downTime
        clearAll()
    }

    fun isGestureSettled(event: MotionEvent) = event.downTime == settledGestureDownTime

    fun recompute(
        screenX: Float,
        screenY: Float,
    ) {
        reconcile(hoverRootViewGroup(), screenX, screenY)
    }

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

    private fun hoverRootViewGroup(): ViewGroup? {
        val window = observedWindow?.get() ?: hoverCallbacks.keys.firstOrNull()?.activityWindow()
        return window?.decorView as? ViewGroup
    }

    private fun clearAll() {
        if (hoveredViews.isEmpty()) {
            return
        }
        for (view in hoveredViews.toList()) {
            hoverCallbacks[view]?.let { setHovered(view, it, false) }
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
        if (observedWindow?.get() === window) {
            return
        }
        removeWindowObserver()
        val original = window.callback ?: return
        val wrapper =
            object : Window.Callback by original {
                override fun dispatchTouchEvent(event: MotionEvent): Boolean {
                    when (event.actionMasked) {
                        MotionEvent.ACTION_DOWN -> {
                            observedGestureDownTime = event.downTime
                            recompute(event.rawX, event.rawY)
                        }
                        MotionEvent.ACTION_UP ->
                            if (event.findPointerIndex(0) >= 0) {
                                settleHover(hoverRootViewGroup(), event)
                            }
                        MotionEvent.ACTION_POINTER_UP ->
                            if (event.getPointerId(event.actionIndex) == 0) {
                                settleHover(hoverRootViewGroup(), event)
                            }
                    }
                    return original.dispatchTouchEvent(event)
                }
            }
        originalWindowCallback = WeakReference(original)
        wrappedWindowCallback = WeakReference(wrapper)
        observedWindow = WeakReference(window)
        window.callback = wrapper
    }

    private fun removeWindowObserver() {
        val window = observedWindow?.get()
        val wrapper = wrappedWindowCallback?.get()
        if (window != null && wrapper != null && window.callback === wrapper) {
            window.callback = originalWindowCallback?.get()
        }
        observedWindow = null
        originalWindowCallback = null
        wrappedWindowCallback = null
        clearAll()
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
