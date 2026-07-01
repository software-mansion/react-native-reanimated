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

/**
 * Drives sticky touch :hover (Chromium model): a tapped view stays hovered after the finger lifts,
 * clearing only when a later touch lands elsewhere or a scroll cancels it. The hosting manager feeds
 * it touch-downs (per-view, plus a window observer for blank space). register also wires the pointer
 * (mouse/stylus) hover, which stays non-sticky.
 */
class TouchHoverCoordinator {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val hoveredViews = LinkedHashSet<View>()
    private val tmpLocation = IntArray(2)
    private val tmpCoords = FloatArray(2)

    // downTime of the gesture the window observer last reconciled, so the per-view touch listener can
    // skip re-reconciling the same Activity-window gesture. Reconciling twice re-runs the hit-test
    // after the first hover already changed a prop, and for svg that invalidates the front element's
    // path mid-gesture so the second hit-test resolves the element behind it.
    private var observedGestureDownTime = Long.MIN_VALUE

    // Reported for :active / :active-deepest: the react tag pressed under this gesture, then its release.
    var onPress: ((tag: Int) -> Unit)? = null
    var onRelease: (() -> Unit)? = null

    // The observer is shared by :hover / :active / :active-deepest, so keep it alive until the last one.
    private var observerRefCount = 0

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
        retainObserver(view)
    }

    fun unregister(view: View) {
        view.setOnHoverListener(null)
        val callback = hoverCallbacks.remove(view)
        if (hoveredViews.remove(view)) {
            callback?.onSelectorStateChanged(false)
        }
        releaseObserver()
    }

    fun isRegistered(view: View) = view in hoverCallbacks

    // Keeps the window observer alive while any touch selector (:hover / :active / :active-deepest) uses it.
    fun retainObserver(view: View) {
        observerRefCount++
        ensureWindowObserver(view)
    }

    fun releaseObserver() {
        if (--observerRefCount == 0) {
            removeWindowObserver()
        }
    }

    // True while the window observer already handled this gesture, so per-view listeners skip it (Modal only).
    fun isObservedGesture(event: MotionEvent) = event.downTime == observedGestureDownTime

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

    // A touch going down on a registered view. The window observer sees Activity-window touches first
    // and reconciles them, so this only runs for gestures the observer missed - i.e. touches inside a
    // Modal/Dialog, a separate window the observer is blind to. This avoids reconciling twice.
    fun onViewTouchDown(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (event.downTime == observedGestureDownTime) {
            return
        }
        reconcile(sourceView.rootView as? ViewGroup, event.rawX, event.rawY)
    }

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

    // Topmost react tag under the touch (svg's virtual child rides the path with a null view), so the
    // host can resolve it and walk up to drive :active / :active-deepest.
    private fun pressTag(
        screenX: Float,
        screenY: Float,
    ): Int? {
        val root = hoverRootViewGroup() ?: return null
        root.getLocationOnScreen(tmpLocation)
        val targets =
            TouchTargetHelper.findTargetPathAndCoordinatesForTouch(
                screenX - tmpLocation[0],
                screenY - tmpLocation[1],
                root,
                tmpCoords,
            )
        return targets.firstOrNull()?.getViewId()
    }

    private fun hoverRootViewGroup(): ViewGroup? {
        val window = observedWindow?.get() ?: hoverCallbacks.keys.firstOrNull()?.activityWindow()
        return window?.decorView as? ViewGroup
    }

    fun clearAll() {
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
        val slop = ViewConfiguration.get(view.context).scaledTouchSlop.toFloat()
        val wrapper =
            object : Window.Callback by original {
                private var startX = 0f
                private var startY = 0f
                private var slopExceeded = false

                override fun dispatchTouchEvent(event: MotionEvent): Boolean {
                    when (event.actionMasked) {
                        MotionEvent.ACTION_DOWN -> {
                            startX = event.rawX
                            startY = event.rawY
                            slopExceeded = false
                            observedGestureDownTime = event.downTime
                            recompute(event.rawX, event.rawY)
                            pressTag(event.rawX, event.rawY)?.let { onPress?.invoke(it) }
                        }
                        // A scroll/drag past slop dismisses sticky :hover and ends the press, matching iOS.
                        MotionEvent.ACTION_MOVE ->
                            if (!slopExceeded) {
                                val dx = event.rawX - startX
                                val dy = event.rawY - startY
                                if (dx * dx + dy * dy > slop * slop) {
                                    slopExceeded = true
                                    clearAll()
                                    onRelease?.invoke()
                                }
                            }
                        MotionEvent.ACTION_UP -> onRelease?.invoke()
                        MotionEvent.ACTION_CANCEL -> {
                            clearAll()
                            onRelease?.invoke()
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
