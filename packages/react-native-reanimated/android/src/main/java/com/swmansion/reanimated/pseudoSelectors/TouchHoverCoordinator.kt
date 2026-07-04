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
 * in between change nothing. A window observer sees whole gestures (including blank space) for every
 * window that hosts a hovered view: the Activity window, plus each Modal/Dialog window fed in via RN's
 * ExtraWindowEventListener (RN >= 0.86). On older RN the per-view listeners are the Modal fallback.
 * register also wires the pointer (mouse/stylus) hover, which stays non-sticky.
 */
class TouchHoverCoordinator {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val hoveredViews = LinkedHashSet<View>()
    private val tmpLocation = IntArray(2)
    private val tmpCoords = FloatArray(2)

    // downTime of the gesture whose release was already settled, so a later finger that inherits
    // pointer id 0 mid-gesture (or the per-view listener echoing the observer) cannot settle again.
    private var settledGestureDownTime = Long.MIN_VALUE

    // One observer per window whose Window.Callback we have wrapped. Held weakly so a dismissed
    // Dialog/Activity window is never pinned by the (long-lived) coordinator: each live window holds
    // its own observer via window.callback, and dead entries are pruned lazily.
    private val observedWindows = mutableListOf<WeakReference<WindowObserver>>()

    // Wraps a window's Window.Callback to observe its whole touch stream (blank space included), rooting
    // reconciliation on that window's own decor view so it works per-window (Activity and each Dialog).
    private inner class WindowObserver(
        window: Window,
        val original: Window.Callback,
    ) : Window.Callback by original {
        val windowRef = WeakReference(window)

        override fun dispatchTouchEvent(event: MotionEvent): Boolean {
            val root = windowRef.get()?.decorView as? ViewGroup
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> reconcile(root, event.rawX, event.rawY)
                // Only the first finger's release settles; a cancel is a system interruption, not a
                // release, so it keeps the :hover (this observer still receives the real UP).
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

    /** Observe a Modal/Dialog window (fed by RN's ExtraWindowEventListener) so its blank-space touches
     *  clear :hover, exactly like the Activity window. */
    fun observeExtraWindow(window: Window) {
        installObserverOnWindow(window)
    }

    /** Stop observing a dismissed Modal/Dialog window and drop only the :hover left inside it. */
    fun stopObservingExtraWindow(window: Window) {
        removeObserverFromWindow(window)
        clearHoverForWindow(window)
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

    // Touch-down on a registered view. Skipped when the view's window is already observed (the window
    // observer handles the whole gesture, incl. blank space); the per-view path is the Modal fallback
    // for windows with no observer (RN < 0.86).
    fun onViewTouchDown(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (isWindowObserved(sourceView) || isGestureSettled(event)) {
            return
        }
        reconcile(sourceView.rootView as? ViewGroup, event.rawX, event.rawY)
    }

    // The Modal/Dialog counterpart of the observer's UP/POINTER_UP release handling.
    fun onViewTouchUp(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (isWindowObserved(sourceView)) {
            return
        }
        settleHover(sourceView.rootView as? ViewGroup, event)
    }

    // The Modal/Dialog counterpart of cancel: with no window observer the real release is never
    // delivered here, so the sticky :hover is dropped.
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

    // Once a gesture's first finger released (or its cancel cleared), later fingers that inherit
    // pointer id 0 within the same gesture must stay ignored, web-like.
    fun isGestureSettled(event: MotionEvent) = event.downTime == settledGestureDownTime

    private fun reconcile(
        root: ViewGroup?,
        screenX: Float,
        screenY: Float,
    ) {
        if (hoverCallbacks.isEmpty()) {
            return
        }
        // hoverCallbacks is iterated globally (across windows) so a blank-space down in one window also
        // clears a :hover held in another; the hit-test itself is rooted on the touched window.
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

    private fun clearAll() {
        if (hoveredViews.isEmpty()) {
            return
        }
        for (view in hoveredViews.toList()) {
            hoverCallbacks[view]?.let { setHovered(view, it, false) }
        }
    }

    // Drops only the :hover held on views living in [window] (used on that window's dismiss), leaving
    // hovers in other windows untouched.
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

    // Catches touch-downs on blank space (off any registered view), which per-view listeners miss.
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
                // Restore only if our wrapper is still the live callback (nothing wrapped us afterwards).
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
