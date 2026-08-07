package com.swmansion.reanimated.css

import android.view.View
import android.view.ViewTreeObserver
import java.util.Collections
import java.util.WeakHashMap

/**
 * A platform transition animates the property React Native itself writes, so a commit can
 * overwrite it mid-flight; re-asserting just before draw covers every writer, since they
 * all run earlier in the same frame. [repair] returns whether anything is still animating.
 */
internal class CSSPlatformTransitionReconciler(
    private val repair: () -> Boolean,
) {
    /**
     * Keyed by window (getViewTreeObserver is per window). Weakly held: a destroyed
     * window's observer stays isAlive forever and never draws, so a strong set would
     * pin one observer per torn-down window.
     */
    private val tracked: MutableSet<ViewTreeObserver> =
        Collections.newSetFromMap(WeakHashMap())

    /** Views awaiting attach, so repeated starts do not stack one listener each. */
    private val pendingAttach: MutableSet<View> =
        Collections.newSetFromMap(WeakHashMap())

    fun track(view: View) {
        if (!view.isAttachedToWindow) {
            // A detached view's floating observer dies on attach, leaving its listener
            // unremovable; register only once the view is genuinely attached.
            if (!pendingAttach.add(view)) return
            view.addOnAttachStateChangeListener(
                object : View.OnAttachStateChangeListener {
                    override fun onViewAttachedToWindow(attached: View) {
                        attached.removeOnAttachStateChangeListener(this)
                        pendingAttach.remove(attached)
                        track(attached)
                    }

                    override fun onViewDetachedFromWindow(detached: View) {
                        detached.removeOnAttachStateChangeListener(this)
                        pendingAttach.remove(detached)
                    }
                },
            )
            return
        }
        tracked.removeAll { !it.isAlive }

        val observer = view.viewTreeObserver
        if (!observer.isAlive || !tracked.add(observer)) return

        observer.addOnPreDrawListener(
            object : ViewTreeObserver.OnPreDrawListener {
                override fun onPreDraw(): Boolean {
                    if (repair()) return true

                    // Nothing left to defend: retire until the next track().
                    if (observer.isAlive) observer.removeOnPreDrawListener(this)
                    tracked.remove(observer)
                    return true
                }
            },
        )
    }
}
