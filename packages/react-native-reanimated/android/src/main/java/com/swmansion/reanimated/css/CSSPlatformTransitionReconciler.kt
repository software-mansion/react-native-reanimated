package com.swmansion.reanimated.css

import android.view.View
import android.view.ViewTreeObserver

/**
 * A platform transition animates the property React Native itself writes, so a commit can
 * overwrite it mid-flight. Re-asserting just before the frame is drawn covers every writer -
 * a Fabric mount, the synchronous props path, the animation backend - without knowing which
 * one ran, since they all run earlier in the same frame.
 *
 * [repair] returns whether anything is still animating.
 */
internal class CSSPlatformTransitionReconciler(
    private val repair: () -> Boolean,
) {
    /** Keyed by window: getViewTreeObserver is per window, not per view. */
    private val tracked = HashSet<ViewTreeObserver>()

    fun track(view: View) {
        if (!view.isAttachedToWindow) {
            // A detached view hands out a floating observer that merges into the window
            // observer on attach and dies, leaving the listener unremovable; register
            // once the view is genuinely attached.
            view.addOnAttachStateChangeListener(
                object : View.OnAttachStateChangeListener {
                    override fun onViewAttachedToWindow(attached: View) {
                        attached.removeOnAttachStateChangeListener(this)
                        track(attached)
                    }

                    override fun onViewDetachedFromWindow(detached: View) {
                        detached.removeOnAttachStateChangeListener(this)
                    }
                },
            )
            return
        }
        // A window torn down mid-animation never draws again, so its listener never retires.
        tracked.removeAll { !it.isAlive }

        val observer = view.viewTreeObserver
        if (!observer.isAlive || !tracked.add(observer)) return

        observer.addOnPreDrawListener(
            object : ViewTreeObserver.OnPreDrawListener {
                override fun onPreDraw(): Boolean {
                    if (repair()) return true

                    // Retiring lazily at draw time keeps the lifecycle one-sided: the
                    // manager only ever tracks, and a registry left empty retires here.
                    if (observer.isAlive) observer.removeOnPreDrawListener(this)
                    tracked.remove(observer)
                    return true
                }
            },
        )
    }
}
