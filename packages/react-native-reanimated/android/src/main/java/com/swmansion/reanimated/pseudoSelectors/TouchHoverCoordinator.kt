package com.swmansion.reanimated.pseudoSelectors

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.MotionEvent
import android.view.View
import android.view.Window
import com.facebook.react.bridge.ReactContext
import com.swmansion.reanimated.nativeProxy.PseudoSelectorCallback
import java.lang.ref.WeakReference

/**
 * Drives touch `:hover` to match the web (Chromium): touching a view makes it (and its registered
 * ancestors) `:hover` and drops any previously-hovered view on that same touch-down. Only the
 * touch-down target and the release location matter: the `:hover` stays for the whole gesture -
 * through moves and scrolls - and on release is kept only if the finger lifts back over a hovered
 * view, otherwise it is dropped. Only the first finger counts; the rest are ignored until it lifts.
 *
 * The touch-down target is reported directly by the touched view's own listener (so the foreground
 * view is always found, unlike a window-wide hit-test that can hit a background screen). The window
 * observer owns the rest of the gesture: it sees the real ACTION_UP with the release location even
 * when a scroll makes the view tree cancel the per-view listener mid-gesture, and it clears the
 * `:hover` when a touch-down lands on blank space off every registered view.
 *
 * register also wires the pointer (mouse/stylus) hover, which stays live and non-sticky.
 */
class TouchHoverCoordinator {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val hovered = LinkedHashSet<View>()
    private val tmpLocation = IntArray(2)

    // Weak so a stale wrapper can never pin a destroyed Activity (this outlives Activities).
    private var observedWindow: WeakReference<Window>? = null
    private var originalWindowCallback: WeakReference<Window.Callback>? = null
    private var wrappedWindowCallback: WeakReference<Window.Callback>? = null

    // The first finger's gesture claims `:hover` by its down time, so the window observer can tell a
    // hover gesture's release from a blank-space touch-down.
    private var claimedDownTime = Long.MIN_VALUE

    fun register(
        view: View,
        callback: PseudoSelectorCallback,
    ) {
        view.setOnHoverListener { _, event ->
            // Real pointer (mouse/stylus) hover: live, non-sticky.
            when (event.actionMasked) {
                MotionEvent.ACTION_HOVER_ENTER,
                MotionEvent.ACTION_HOVER_MOVE,
                -> reconcileToBranchOf(view)
                MotionEvent.ACTION_HOVER_EXIT -> setHovered(view, callback, false)
            }
            false
        }
        hoverCallbacks[view] = callback
        ensureWindowObserver(view)
    }

    fun unregister(view: View) {
        view.setOnHoverListener(null)
        val callback = hoverCallbacks.remove(view)
        if (hovered.remove(view)) {
            callback?.onSelectorStateChanged(false)
        }
        if (hoverCallbacks.isEmpty()) {
            removeWindowObserver()
        }
    }

    fun isRegistered(view: View) = view in hoverCallbacks

    /**
     * Fed by the shared per-view touch listener for every registered view. The touched view itself is
     * passed, so the foreground branch is always the one that lights up. Only the touch-down is handled
     * here; the window observer owns the release (see [ensureWindowObserver]).
     */
    fun onBoxTouch(
        view: View,
        event: MotionEvent,
    ) {
        // Only the first finger drives `:hover`; a second finger lands on another view as its own
        // split-down with a non-zero pointer id and is ignored. The deepest touched view claims the
        // gesture first (its listener runs before its ancestors'), so its branch is the one that lights.
        if (event.actionMasked == MotionEvent.ACTION_DOWN &&
            event.getPointerId(0) == 0 &&
            event.downTime != claimedDownTime
        ) {
            claimedDownTime = event.downTime
            reconcileToBranchOf(view)
        }
    }

    // Walks up from the touched view, turning `:hover` on for it and every registered ancestor on the
    // branch and off for the rest.
    private fun reconcileToBranchOf(view: View) {
        val branch = HashSet<View>()
        var current: View? = view
        while (current != null) {
            if (current in hoverCallbacks) {
                branch.add(current)
            }
            current = current.parent as? View
        }
        for ((hoverView, callback) in hoverCallbacks) {
            setHovered(hoverView, callback, hoverView in branch)
        }
    }

    private fun isPointInView(
        view: View,
        screenX: Float,
        screenY: Float,
    ): Boolean {
        view.getLocationOnScreen(tmpLocation)
        return screenX >= tmpLocation[0] &&
            screenX <= tmpLocation[0] + view.width &&
            screenY >= tmpLocation[1] &&
            screenY <= tmpLocation[1] + view.height
    }

    private fun isPointOverAnyHovered(
        screenX: Float,
        screenY: Float,
    ): Boolean {
        for (view in hovered) {
            if (isPointInView(view, screenX, screenY)) {
                return true
            }
        }
        return false
    }

    private fun clearAll() {
        for ((view, callback) in hoverCallbacks) {
            setHovered(view, callback, false)
        }
    }

    private fun setHovered(
        view: View,
        callback: PseudoSelectorCallback,
        on: Boolean,
    ) {
        if ((view in hovered) == on) {
            return
        }
        if (on) hovered.add(view) else hovered.remove(view)
        callback.onSelectorStateChanged(on)
    }

    // Decides a hover gesture's fate at the first finger's release: keep `:hover` when the finger lifts
    // back over a hovered view, drop it otherwise. Screen coords for the lifting pointer are derived
    // from the index-0 raw/local delta, since getRawX/Y(index) needs API 29.
    private fun finishHoverGesture(
        event: MotionEvent,
        pointerIndex: Int,
    ) {
        if (event.downTime != claimedDownTime) {
            return // not the hover gesture (e.g. a stray up after it was already resolved)
        }
        claimedDownTime = Long.MIN_VALUE
        val screenX = event.getX(pointerIndex) + (event.rawX - event.getX(0))
        val screenY = event.getY(pointerIndex) + (event.rawY - event.getY(0))
        if (!isPointOverAnyHovered(screenX, screenY)) {
            clearAll()
        }
    }

    // The window observer sees the whole gesture at the Window.Callback level, above the view tree, so
    // it still gets the real ACTION_UP (with the release location) even after a scroll makes the tree
    // cancel the per-view listener. A touch-down first goes to the tree (a hover view claims it via its
    // own listener); if nothing claimed the gesture, the down was on blank space and `:hover` is cleared.
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
                    val handled = original.dispatchTouchEvent(event)
                    when (event.actionMasked) {
                        // A touch-down that no hover view claimed landed on blank space -> drop `:hover`.
                        MotionEvent.ACTION_DOWN ->
                            if (event.getPointerId(0) == 0 && claimedDownTime != event.downTime) {
                                clearAll()
                            }
                        // The first finger lifts, either last or early while others stay down: keep
                        // `:hover` only if it lifted back over a hovered view.
                        MotionEvent.ACTION_UP ->
                            if (event.getPointerId(0) == 0) {
                                finishHoverGesture(event, 0)
                            }
                        MotionEvent.ACTION_POINTER_UP ->
                            if (event.getPointerId(event.actionIndex) == 0) {
                                finishHoverGesture(event, event.actionIndex)
                            }
                        // A system-level cancel is not a deliberate release, so `:hover` is kept.
                        MotionEvent.ACTION_CANCEL -> claimedDownTime = Long.MIN_VALUE
                    }
                    return handled
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
        claimedDownTime = Long.MIN_VALUE
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
