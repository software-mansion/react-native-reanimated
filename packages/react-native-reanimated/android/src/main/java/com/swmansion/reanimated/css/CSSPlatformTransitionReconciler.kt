package com.swmansion.reanimated.css

import android.view.View
import android.view.ViewTreeObserver

/**
 * React writes the same property the animator drives, so a commit can overwrite it mid-flight.
 * Running [beforeDraw] at that point puts it after every writer without knowing which one ran,
 * since they all run earlier in the frame. Its return says whether the listener stays.
 */
internal class CSSPlatformTransitionReconciler(
    private val beforeDraw: () -> Boolean,
) {
    /** Keyed by window: getViewTreeObserver is per window, not per view. */
    private val tracked = HashMap<ViewTreeObserver, ViewTreeObserver.OnPreDrawListener>()

    fun track(view: View) {
        // A window torn down mid-animation never draws again, so its listener never retires.
        tracked.keys.removeAll { !it.isAlive }

        // A detached view hands out a temporary observer that is killed once the view attaches
        // and its listeners are merged into the window's, leaving nothing to remove them from.
        if (!view.isAttachedToWindow) return

        val observer = view.viewTreeObserver
        if (!observer.isAlive || tracked.containsKey(observer)) return

        val listener =
            object : ViewTreeObserver.OnPreDrawListener {
                override fun onPreDraw(): Boolean {
                    if (beforeDraw()) return true

                    // Retire here, not when the registry empties: a cancel fires its end
                    // callback mid-replacement, when the registry is briefly empty.
                    retire(observer, this)
                    return true
                }
            }
        tracked[observer] = listener
        observer.addOnPreDrawListener(listener)
    }

    /** The listeners live on the window, which outlives the React context. */
    fun invalidate() {
        tracked.forEach { (observer, listener) ->
            if (observer.isAlive) observer.removeOnPreDrawListener(listener)
        }
        tracked.clear()
    }

    private fun retire(
        observer: ViewTreeObserver,
        listener: ViewTreeObserver.OnPreDrawListener,
    ) {
        if (observer.isAlive) observer.removeOnPreDrawListener(listener)
        tracked.remove(observer)
    }
}
