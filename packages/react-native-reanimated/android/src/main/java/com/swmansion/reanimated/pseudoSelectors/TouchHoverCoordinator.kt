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
 * Drives touch `:hover` to match the web (Chromium): a tap makes the touched view sticky-hovered, a
 * pan/scroll never changes the committed hover (it rolls back on release), and only the first finger
 * counts - the rest are ignored until it lifts.
 *
 * `committed` is the sticky hover a tap leaves behind; `displayed` is what is shown right now. Touch
 * events arrive from two places that feed the same single-primary-touch state machine: the window
 * observer (gestures anywhere in the Activity window, which it sees first and so claims) and the
 * per-view listener (gestures inside a Modal/Dialog, a separate window the observer is blind to).
 * Both forwarding the same Activity gesture is harmless - the guards keep it idempotent.
 *
 * register also wires the pointer (mouse/stylus) hover, which stays live and non-sticky.
 */
class TouchHoverCoordinator {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val displayed = LinkedHashSet<View>()
    private val committed = LinkedHashSet<View>()
    private val tmpLocation = IntArray(2)
    private val tmpCoords = FloatArray(2)

    // Weak so a stale wrapper can never pin a destroyed Activity (this outlives Activities).
    private var observedWindow: WeakReference<Window>? = null
    private var originalWindowCallback: WeakReference<Window.Callback>? = null
    private var wrappedWindowCallback: WeakReference<Window.Callback>? = null

    // The first finger of a gesture owns `:hover`; later fingers are ignored until it lifts.
    private var primaryActive = false
    private var primaryDownTime = 0L
    private var primaryPointerId = -1
    private var downRawX = 0f
    private var downRawY = 0f
    private var panned = false
    private var downOnBlank = false
    private var rolledBackForScroll = false
    private var touchSlop = 0

    fun register(
        view: View,
        callback: PseudoSelectorCallback,
    ) {
        view.setOnHoverListener { _, event ->
            // Real pointer (mouse/stylus) hover: live, non-sticky - keep committed in sync with it.
            // Ignored while a finger gesture owns the state, so a stray hover event can't corrupt the
            // in-flight gesture's rollback target.
            when (event.actionMasked) {
                MotionEvent.ACTION_HOVER_ENTER,
                MotionEvent.ACTION_HOVER_MOVE,
                MotionEvent.ACTION_HOVER_EXIT,
                ->
                    if (!primaryActive) {
                        displayHitPath(view.rootView as? ViewGroup, event.rawX, event.rawY)
                        committed.clear()
                        committed.addAll(displayed)
                    }
            }
            false
        }
        hoverCallbacks[view] = callback
        if (touchSlop == 0) {
            touchSlop = ViewConfiguration.get(view.context).scaledTouchSlop
        }
        ensureWindowObserver(view)
    }

    fun unregister(view: View) {
        view.setOnHoverListener(null)
        val callback = hoverCallbacks.remove(view)
        committed.remove(view)
        if (displayed.remove(view)) {
            callback?.onSelectorStateChanged(false)
        }
        // Drop any in-flight gesture: a view torn down mid-press (e.g. a Modal driving the primary
        // touch via its own window) might never deliver the terminal up/cancel, which would otherwise
        // leave `primaryActive` stuck and silently ignore every later touch. The next touch re-claims.
        primaryActive = false
        if (hoverCallbacks.isEmpty()) {
            removeWindowObserver()
        }
    }

    fun isRegistered(view: View) = view in hoverCallbacks

    /**
     * Single entry point for the touch model, fed by both the per-view listener (passing the touched
     * view's root, so Modal/Dialog windows work) and the window observer (passing the decor view).
     * Only ACTION_DOWN/MOVE/UP/CANCEL of the first finger matter.
     */
    fun onTouchEvent(
        event: MotionEvent,
        root: ViewGroup?,
    ) {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> onPrimaryDown(event, root)
            MotionEvent.ACTION_MOVE -> onPrimaryMove(event)
            MotionEvent.ACTION_POINTER_UP ->
                if (event.getPointerId(event.actionIndex) == primaryPointerId) {
                    onPrimaryEnd(event)
                }
            MotionEvent.ACTION_UP -> onPrimaryEnd(event)
            MotionEvent.ACTION_CANCEL -> onPrimaryCancel(event)
        }
    }

    private fun onPrimaryDown(
        event: MotionEvent,
        root: ViewGroup?,
    ) {
        if (primaryActive || hoverCallbacks.isEmpty()) {
            return
        }
        primaryActive = true
        primaryDownTime = event.downTime
        primaryPointerId = event.getPointerId(0)
        downRawX = event.rawX
        downRawY = event.rawY
        panned = false
        rolledBackForScroll = false
        // Reconcile the live hover to the touched branch: press feedback on it, previous hover
        // cleared right away (restored on release if this turns into a pan/scroll).
        displayHitPath(root, event.rawX, event.rawY)
        // Empty hit-path == the gesture began off every hover view (blank space / a scroll surface).
        downOnBlank = displayed.isEmpty()
    }

    private fun onPrimaryMove(event: MotionEvent) {
        if (!primaryActive || event.downTime != primaryDownTime) {
            return
        }
        // event.rawX/rawY track the first finger (pointer index 0) for the whole gesture.
        if (movedPastSlop(event)) {
            // A drag/scroll: keep showing the down branch (so hover stays while the finger is over
            // the view) but mark it so the release rolls back to the committed hover instead of
            // committing this branch.
            panned = true
        }
        // A drag that began off every hover view (typically a scroll) can never commit a new branch,
        // so roll back to the committed hover right away instead of waiting for release. This keeps a
        // sticky-hovered view visible while scrolling from blank space (matching iOS, where the
        // enclosing scroll view's drag is detected). A drag that began on a hover view is left alone:
        // its release decides, and a scroll over it is rolled back by the per-view touch-cancel.
        if (panned && downOnBlank && !rolledBackForScroll) {
            rolledBackForScroll = true
            revertToCommitted()
        }
    }

    // ACTION_UP always carries the final position, so deciding tap-vs-pan from the lift point is
    // robust even when a scrolling child swallows the intervening ACTION_MOVE events at the window.
    private fun movedPastSlop(event: MotionEvent): Boolean {
        val dx = event.rawX - downRawX
        val dy = event.rawY - downRawY
        return dx * dx + dy * dy > touchSlop.toFloat() * touchSlop
    }

    private fun onPrimaryEnd(event: MotionEvent) {
        if (!primaryActive || event.downTime != primaryDownTime) {
            return
        }
        if (movedPastSlop(event)) {
            panned = true
        }
        primaryActive = false
        if (panned) {
            revertToCommitted() // A pan/scroll never changes the sticky hover.
        } else {
            commitDisplayed() // A tap makes the touched branch sticky.
        }
    }

    private fun onPrimaryCancel(event: MotionEvent) {
        if (!primaryActive || event.downTime != primaryDownTime) {
            return
        }
        primaryActive = false
        revertToCommitted()
    }

    /**
     * Mirrors CSS hit-testing: turns hover on for the topmost view at the point and its registered
     * ancestors, off for the rest. Views that merely overlap the hit branch (which a plain bounds
     * test would all activate) stay off, because only the hit branch is hovered.
     */
    private fun displayHitPath(
        root: ViewGroup?,
        screenX: Float,
        screenY: Float,
    ) {
        val hitPath: Set<View> = if (root == null) emptySet() else hitTestPath(root, screenX, screenY)
        for ((view, callback) in hoverCallbacks) {
            setDisplayed(view, callback, view in hitPath)
        }
    }

    // Views on the hit branch (topmost target up to the root) via RN's hit-test, which already honors
    // z-order, transforms, clipping and pointer-events.
    private fun hitTestPath(
        root: ViewGroup,
        screenX: Float,
        screenY: Float,
    ): Set<View> {
        root.getLocationOnScreen(tmpLocation)
        val localX = screenX - tmpLocation[0]
        val localY = screenY - tmpLocation[1]
        val targets =
            TouchTargetHelper.findTargetPathAndCoordinatesForTouch(localX, localY, root, tmpCoords)
        val views = HashSet<View>(targets.size)
        for (target in targets) {
            target.getView()?.let { views.add(it) }
        }
        return views
    }

    fun clearAll() {
        for ((view, callback) in hoverCallbacks) {
            setDisplayed(view, callback, false)
        }
        committed.clear()
    }

    private fun commitDisplayed() {
        committed.clear()
        committed.addAll(displayed)
    }

    private fun revertToCommitted() {
        for ((view, callback) in hoverCallbacks) {
            setDisplayed(view, callback, view in committed)
        }
    }

    private fun setDisplayed(
        view: View,
        callback: PseudoSelectorCallback,
        hovered: Boolean,
    ) {
        if ((view in displayed) == hovered) {
            return
        }
        if (hovered) displayed.add(view) else displayed.remove(view)
        callback.onSelectorStateChanged(hovered)
    }

    // Catches gestures on blank space (off any registered view), which per-view listeners miss, and
    // drives every Activity-window gesture (it sees them before the per-view listeners).
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
                    onTouchEvent(event, window.decorView as? ViewGroup)
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
        primaryActive = false
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
