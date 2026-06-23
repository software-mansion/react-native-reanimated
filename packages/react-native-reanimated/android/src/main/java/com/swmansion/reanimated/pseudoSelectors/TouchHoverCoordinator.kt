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
 * Drives sticky touch :hover (Chromium model): a tapped view stays hovered after the finger lifts,
 * clearing only when a later touch lands elsewhere or a scroll cancels it. The hosting manager feeds
 * it touch-downs (per-view, plus a window observer for blank space). register also wires the pointer
 * (mouse/stylus) hover, which stays non-sticky.
 */
class TouchHoverCoordinator {
    private val hoverCallbacks = LinkedHashMap<View, PseudoSelectorCallback>()
    private val hoveredViews = LinkedHashSet<View>()
    private val tmpLocation = IntArray(2)

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
                -> recompute(event.rawX, event.rawY)
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

    fun isRegistered(view: View) = view in hoverCallbacks

    /** Turns :hover on for every registered view whose bounds contain the touch, off for the rest. */
    fun recompute(
        screenX: Float,
        screenY: Float,
    ) {
        if (hoverCallbacks.isEmpty()) {
            return
        }
        for ((view, callback) in hoverCallbacks) {
            setHovered(view, callback, isPointInViewOnScreen(view, screenX, screenY))
        }
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

    private fun isPointInViewOnScreen(
        view: View,
        screenX: Float,
        screenY: Float,
    ): Boolean {
        if (!view.isShown) {
            return false
        }
        view.getLocationOnScreen(tmpLocation)
        val left = tmpLocation[0]
        val top = tmpLocation[1]
        return screenX >= left && screenX <= left + view.width &&
            screenY >= top && screenY <= top + view.height
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
                        MotionEvent.ACTION_DOWN -> recompute(event.rawX, event.rawY)
                        MotionEvent.ACTION_CANCEL -> clearAll()
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
