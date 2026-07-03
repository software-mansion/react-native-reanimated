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

/**
 * Drives sticky touch :hover: only the touch-down and release locations matter. A touch-down hovers
 * the views on its hit branch (and unhovers the rest, including on blank space), and when the first
 * finger lifts, a hovered view stays hovered only if the finger is still over it - moves and scrolls
 * in between change nothing. The Activity-window observer sees whole gestures; the hosting manager
 * feeds per-view touches as the fallback for windows the observer is blind to (Modal/Dialog).
 * register also wires the pointer (mouse/stylus) hover, which stays non-sticky.
 */
class TouchHoverCoordinator {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val hoveredViews = LinkedHashSet<View>()
    private val tmpLocation = IntArray(2)
    private val tmpCoords = FloatArray(2)

    // downTime of the gesture the window observer last reconciled, letting the per-view listener skip
    // reconciling it again: a second reconcile re-runs the hit-test after the first hover mutated a
    // prop, which for svg invalidates the front element's path so it resolves the one behind it.
    private var observedGestureDownTime = Long.MIN_VALUE

    // downTime of the gesture whose release was already settled, so a later finger that inherits
    // pointer id 0 mid-gesture (or the per-view listener echoing the observer) cannot settle again.
    private var settledGestureDownTime = Long.MIN_VALUE

    // Weak so a stale wrapper can never pin a destroyed Activity (this outlives Activities).
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

    /**
     * Mirrors CSS hit-testing: turns :hover on for the topmost view at the touch and its registered
     * ancestors, off for the rest. Views that merely overlap the hit branch (which a plain bounds
     * test would all activate) stay off, because only the hit branch is hovered. Rooted on the
     * touched view's own window so it works inside a Modal/Dialog (a separate window from the Activity).
     */
    fun recompute(
        sourceView: View,
        screenX: Float,
        screenY: Float,
    ) {
        reconcile(sourceView.rootView as? ViewGroup, screenX, screenY)
    }

    // Touch-down on a registered view. The observer reconciles Activity-window gestures first, so this
    // only handles ones it misses - e.g. a touch inside a Modal, a window the observer can't see.
    fun onViewTouchDown(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (event.downTime == observedGestureDownTime || isGestureSettled(event)) {
            return
        }
        reconcile(sourceView.rootView as? ViewGroup, event.rawX, event.rawY)
    }

    // The Modal/Dialog counterpart of the observer's UP/POINTER_UP release handling.
    fun onViewTouchUp(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (event.downTime == observedGestureDownTime) {
            return
        }
        settleHover(sourceView.rootView as? ViewGroup, event)
    }

    // The Modal/Dialog counterpart of cancel: it ends the gesture for good (the real release is never
    // delivered there), so the sticky :hover is dropped.
    fun onViewTouchCancel(event: MotionEvent) {
        if (event.downTime == observedGestureDownTime || isGestureSettled(event)) {
            return
        }
        settledGestureDownTime = event.downTime
        clearAll()
    }

    // Once a gesture's first finger released (or its cancel cleared), later fingers that inherit
    // pointer id 0 within the same gesture must stay ignored, web-like.
    fun isGestureSettled(event: MotionEvent) = event.downTime == settledGestureDownTime

    // Blank-space (window observer) path: no source view, so hit-test the observed window's tree.
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

    // The first finger lifted: a hovered view stays hovered only if the finger is still over it.
    // Screen coords of the lifting pointer come from the index-0 raw/local delta (getRawX/Y(index)
    // needs API 29); nothing new is ever hovered here.
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

    // React tags on the hit branch (RN's hit-test honors z-order/transforms/clipping/pointer-events).
    // Matching by tag also covers svg's virtual children, whose tag rides the path with a null view.
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

    // Catches touch-downs on blank space (off any registered view), which per-view listeners miss.
    private fun ensureWindowObserver(view: View) {
        val window = view.activityWindow() ?: return
        if (observedWindow?.get() === window) {
            return
        }
        // The Activity (and its window) can be replaced; re-bind onto the live one.
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
                        // Only the first finger's release settles the gesture; it can arrive as the
                        // last-finger up or early, while other fingers stay down. A cancel is a system
                        // interruption, not a release, so it keeps the :hover.
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
        // Restore only if our wrapper is still the live callback (nothing wrapped us afterwards).
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
