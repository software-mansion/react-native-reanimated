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
 * ancestors) `:hover` and drops any previously-hovered view on that same touch-down; the `:hover` then
 * stays for the whole gesture - through moves and scrolls - and is dropped on release only when the
 * finger lifts off the view without a scroll having taken the gesture over. Only the first finger
 * counts; the rest are ignored until it lifts.
 *
 * The touched view is reported directly by its own touch listener (so the foreground view is always
 * found, unlike a window-wide hit-test that can hit a background screen). A window observer handles the
 * blank-space case: if a touch-down is not claimed by any hover view it clears the `:hover`.
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

    // A hover view claims the in-flight gesture (by its down time); the window observer then knows the
    // touch did not land on blank space. The deepest touched view becomes the down-target.
    private var claimedDownTime = Long.MIN_VALUE
    private var downTargetView: WeakReference<View>? = null

    // Enclosing scrollable of the down-target + its scroll position at touch-down, so the release can
    // tell a scroll (keep `:hover`) from a deliberate drag off the view (drop it). A scroll may end as
    // a normal ACTION_UP off the view rather than an ACTION_CANCEL, so the offset is the reliable cue.
    private var downScrollable: WeakReference<View>? = null
    private var downScrollX = 0
    private var downScrollY = 0

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
        if (downTargetView?.get() === view) {
            downTargetView = null
        }
        if (hoverCallbacks.isEmpty()) {
            removeWindowObserver()
        }
    }

    fun isRegistered(view: View) = view in hoverCallbacks

    /**
     * Fed by the shared per-view touch listener for every registered view. The touched view itself is
     * passed, so the foreground branch is always the one that lights up.
     */
    fun onBoxTouch(
        view: View,
        event: MotionEvent,
    ) {
        when (event.actionMasked) {
            // Only the first finger drives `:hover`; a second finger lands on another view as its own
            // split-down with a non-zero pointer id and is ignored.
            MotionEvent.ACTION_DOWN -> {
                if (event.getPointerId(0) != 0 || event.downTime == claimedDownTime) {
                    return // not the first finger, or a shallower view already claimed this gesture
                }
                claimedDownTime = event.downTime
                downTargetView = WeakReference(view)
                val scrollable = enclosingScrollable(view)
                downScrollable = scrollable?.let { WeakReference(it) }
                downScrollX = scrollable?.scrollX ?: 0
                downScrollY = scrollable?.scrollY ?: 0
                reconcileToBranchOf(view)
            }
            MotionEvent.ACTION_UP -> {
                if (downTargetView?.get() !== view) {
                    return
                }
                downTargetView = null
                // A scroll keeps the `:hover`; otherwise it is dropped unless released back over the
                // view (releasing over it keeps it sticky).
                if (!hasScrolled() && !isPointInView(view, event.rawX, event.rawY)) {
                    clearAll()
                }
            }
            MotionEvent.ACTION_CANCEL -> {
                // A scroll (or other ancestor) took the gesture over - keep the `:hover`.
                if (downTargetView?.get() === view) {
                    downTargetView = null
                }
            }
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

    private fun hasScrolled(): Boolean {
        val scrollable = downScrollable?.get() ?: return false
        return scrollable.scrollX != downScrollX || scrollable.scrollY != downScrollY
    }

    private fun enclosingScrollable(view: View?): View? {
        var current: View? = view
        while (current != null) {
            if (current.canScrollVertically(1) ||
                current.canScrollVertically(-1) ||
                current.canScrollHorizontally(1) ||
                current.canScrollHorizontally(-1)
            ) {
                return current
            }
            current = current.parent as? View
        }
        return null
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

    // Catches touch-downs on blank space (off every registered view). The down is first dispatched to
    // the view tree (a hover view claims it via its own listener), then checked: if nothing claimed
    // this gesture, the touch was on blank space and the `:hover` is cleared.
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
                    if (event.actionMasked == MotionEvent.ACTION_DOWN &&
                        event.getPointerId(0) == 0 &&
                        claimedDownTime != event.downTime
                    ) {
                        clearAll()
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
        downTargetView = null
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
