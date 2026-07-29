package com.swmansion.reanimated.css

import android.view.View
import android.view.ViewTreeObserver

/**
 * Platform transitions animate the same View property React Native writes, so a
 * commit touching the view overwrites the running animation - and on Android
 * Fabric re-applies the whole props blob, so any prop changing is enough.
 *
 * Every writer (a Fabric mount, the synchronous props path, the animation backend)
 * runs on the UI thread earlier in the frame, so re-asserting just before the frame
 * is drawn covers all of them without knowing which one ran.
 *
 * One listener per window, not per view: getViewTreeObserver returns the window's
 * observer, so registering per view would run [repair] once per animating view.
 */
internal class CSSPlatformTransitionReconciler(
    private val repair: () -> Unit,
) {
    private val observers = HashMap<ViewTreeObserver, ViewTreeObserver.OnPreDrawListener>()

    fun track(view: View) {
        val observer = view.viewTreeObserver
        if (!observer.isAlive || observers.containsKey(observer)) return

        val listener =
            ViewTreeObserver.OnPreDrawListener {
                repair()
                true
            }
        observer.addOnPreDrawListener(listener)
        observers[observer] = listener
    }

    fun untrackAll() {
        observers.forEach { (observer, listener) ->
            if (observer.isAlive) observer.removeOnPreDrawListener(listener)
        }
        observers.clear()
    }
}
