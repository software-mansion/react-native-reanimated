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
 * Sticky touch :hover: a touch-down hovers the views on its hit branch and unhovers the rest; the
 * first finger's release keeps a view hovered only if the finger is still over it (moves, scrolls,
 * and cancels in between change nothing). A per-window Window.Callback observer drives every window
 * with a hovered view; per-view listeners are the pre-0.86 Modal/Dialog fallback.
 */
class TouchHoverCoordinator {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val hoveredViews = LinkedHashSet<View>()
    private val hoverHostRefs = HashMap<View, Int>()
    private val tmpLocation = IntArray(2)
    private val tmpCoords = FloatArray(2)

    private var settledGestureDownTime = Long.MIN_VALUE
    private var touchSlop = -1f

    // Pointer (mouse/stylus) hover only; the touch paths never read these. True while the last pointer
    // sample hit-tested onto a registered view's branch, so an off-branch pointer that never entered is
    // left alone and can't clobber a touch-set sticky. lastPointer* anchors the slop-gated re-hit-test.
    private var pointerInsideRegistered = false
    private var lastPointerX = 0f
    private var lastPointerY = 0f

    private val observedWindows = mutableListOf<WeakReference<WindowObserver>>()

    // The observer is shared by :hover and the press selectors; keep it installed until neither needs it.
    private var windowObserverRetainCount = 0

    // Press selectors tap the same per-window touch stream to catch the MOVE/UP a compound host swallows.
    private var windowTouchInterceptor: ((MotionEvent) -> Unit)? = null

    private inner class WindowObserver(
        window: Window,
        val original: Window.Callback,
    ) : Window.Callback by original {
        val windowRef = WeakReference(window)
        private val downPoint = FloatArray(2)

        override fun dispatchTouchEvent(event: MotionEvent): Boolean {
            val root = windowRef.get()?.decorView as? ViewGroup
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downPoint[0] = event.rawX
                    downPoint[1] = event.rawY
                    pointerInsideRegistered = false
                    reconcile(root, event.rawX, event.rawY)
                }
                MotionEvent.ACTION_UP ->
                    if (event.findPointerIndex(0) >= 0) settleHover(root, event, downPoint)
                MotionEvent.ACTION_POINTER_UP ->
                    if (event.getPointerId(event.actionIndex) == 0) settleHover(root, event, downPoint)
            }
            windowTouchInterceptor?.invoke(event)
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

    fun setWindowTouchInterceptor(interceptor: (MotionEvent) -> Unit) {
        windowTouchInterceptor = interceptor
    }

    // Both :hover and the press selectors need the per-window observer; ref-count so it outlives whichever
    // registers first and is torn down only once the last of them detaches.
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
            removeAllWindowObservers()
        }
    }

    // Pointer (mouse/stylus) hover follows the pointer non-stickily. Its listener lives on the touch
    // HOST, not the registered view: an svg element is a virtual child of its SvgView and never receives
    // hover events, so the listener must sit on the SvgView and reconcile the hit branch. For a plain
    // view the host is the view. Ref-counted since a host (an SvgView) can back several hover elements.
    private fun acquireHoverListener(host: View) {
        val count = hoverHostRefs.getOrDefault(host, 0)
        hoverHostRefs[host] = count + 1
        if (count == 0) {
            host.setOnHoverListener { _, event ->
                when (event.actionMasked) {
                    MotionEvent.ACTION_HOVER_ENTER,
                    MotionEvent.ACTION_HOVER_MOVE,
                    -> recompute(host, event.rawX, event.rawY)
                    MotionEvent.ACTION_HOVER_EXIT -> onPointerExit()
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
        installObserverOnWindow(window)
    }

    fun stopObservingExtraWindow(window: Window) {
        removeObserverFromWindow(window)
        clearHoverForWindow(window)
    }

    /**
     * Pointer (mouse/stylus) hover. A pointer streams a flood of HOVER_MOVE across the whole host, and
     * for an SvgView host that canvas dwarfs the drawn element. Re-hit-testing every event would unhover
     * a touch-set sticky the instant the pointer strays onto empty canvas it never entered, and trip the
     * RNSVG quirk where a stationary re-hit-test right after a fill change resolves the element behind it.
     * So we re-apply only on a real change: crossing the over/not-over edge, or moving past slop while
     * over the hit branch. A stationary pointer, or one over empty canvas it never entered, is left be.
     */
    fun recompute(
        sourceView: View,
        screenX: Float,
        screenY: Float,
    ) {
        val root = sourceView.rootView as? ViewGroup ?: return
        if (hoverCallbacks.isEmpty()) {
            return
        }
        val hitTags = hitTestPath(root, screenX, screenY)
        val overRegistered = hoverCallbacks.keys.any { it.id in hitTags }
        if (overRegistered) {
            if (!pointerInsideRegistered || movedBeyondSlop(root, screenX, screenY)) {
                applyHover(hitTags)
                lastPointerX = screenX
                lastPointerY = screenY
            }
        } else if (pointerInsideRegistered) {
            applyHover(hitTags)
        }
        pointerInsideRegistered = overRegistered
    }

    // A true pointer exit (pen lifted, mouse left the host) unhovers the branch it was on. We can't
    // trust the exit coordinates: some devices report an EXIT whose point is still over the host.
    private fun onPointerExit() {
        if (pointerInsideRegistered) {
            applyHover(emptySet())
        }
        pointerInsideRegistered = false
    }

    private fun movedBeyondSlop(
        root: ViewGroup?,
        screenX: Float,
        screenY: Float,
    ): Boolean {
        val dx = screenX - lastPointerX
        val dy = screenY - lastPointerY
        val slop = scaledTouchSlop(root)
        return dx * dx + dy * dy > slop * slop
    }

    fun onViewTouchDown(
        sourceView: View,
        event: MotionEvent,
    ) {
        if (isWindowObserved(sourceView) || isGestureSettled(event)) {
            return
        }
        pointerInsideRegistered = false
        reconcile(sourceView.rootView as? ViewGroup, event.rawX, event.rawY)
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
        applyHover(if (root == null) emptySet() else hitTestPath(root, screenX, screenY))
    }

    // Turn :hover on for the registered views on the hit branch and off for the rest. A set operation,
    // so registered ancestors on the branch hover together with the leaf.
    private fun applyHover(hitTags: Set<Int>) {
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
        // getRawX/Y(index) needs API 29, so reconstruct the lifting pointer's screen coords from the delta.
        val screenX = event.getX(index) + (event.rawX - event.getX(0))
        val screenY = event.getY(index) + (event.rawY - event.getY(0))
        if (downPoint != null && isStationary(screenX, screenY, downPoint, root)) {
            // Keep :hover as set on down. Re-hit-testing a stationary release is redundant and hits an
            // RNSVG quirk: the re-rendered front element resolves the one behind it, dropping the hover.
            return
        }
        val hitTags: Set<Int> = if (root == null) emptySet() else hitTestPath(root, screenX, screenY)
        unhoverWhere { it.id !in hitTags }
    }

    private fun isStationary(
        x: Float,
        y: Float,
        downPoint: FloatArray,
        root: ViewGroup?,
    ): Boolean {
        val dx = x - downPoint[0]
        val dy = y - downPoint[1]
        val slop = scaledTouchSlop(root)
        return dx * dx + dy * dy <= slop * slop
    }

    private fun scaledTouchSlop(root: ViewGroup?): Float {
        if (touchSlop < 0f) {
            val context = root?.context ?: hoverCallbacks.keys.firstOrNull()?.context ?: return 0f
            touchSlop = ViewConfiguration.get(context).scaledTouchSlop.toFloat()
        }
        return touchSlop
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

    private inline fun unhoverWhere(predicate: (View) -> Boolean) {
        if (hoveredViews.isEmpty()) {
            return
        }
        // toList() snapshots because setHovered mutates hoveredViews.
        for (view in hoveredViews.toList()) {
            if (predicate(view)) {
                hoverCallbacks[view]?.let { setHovered(view, it, false) }
            }
        }
    }

    private fun clearAll() {
        pointerInsideRegistered = false
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
        installObserverOnWindow(window)
    }

    private fun installObserverOnWindow(window: Window) {
        observedWindows.removeAll { it.liveWindow() == null }
        if (observedWindows.any { it.liveWindow() === window }) {
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
                restoreCallback(observer)
                iterator.remove()
            }
        }
    }

    private fun removeAllWindowObservers() {
        for (reference in observedWindows) {
            reference.get()?.let { restoreCallback(it) }
        }
        observedWindows.clear()
        clearAll()
    }

    // Restore only if our wrapper is still the live callback (nothing wrapped us afterwards).
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
