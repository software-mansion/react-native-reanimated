package com.swmansion.reanimated.css

import android.view.View
import android.view.ViewTreeObserver

/**
 * Platform transitions animate the same View property React Native writes, so a commit
 * touching the view overwrites the running animation - and on Android Fabric re-applies
 * the whole props blob, so any prop changing is enough.
 *
 * Every writer (a Fabric mount, the synchronous props path, the animation backend) runs on
 * the UI thread earlier in the frame, so re-asserting just before the frame is drawn covers
 * all of them without knowing which one ran.
 *
 * One listener per window, not per view: getViewTreeObserver returns the window's observer.
 * Each listener retires itself once [repair] reports nothing left to hold, so a cancel that
 * momentarily empties the registry cannot deregister a still-needed listener.
 */
internal class CSSPlatformTransitionReconciler(
    private val repair: () -> Boolean,
) {
    private val observers = HashMap<ViewTreeObserver, ViewTreeObserver.OnPreDrawListener>()

    fun track(view: View) {
        val observer = view.viewTreeObserver
        if (!observer.isAlive || observers.containsKey(observer)) return

        val listener =
            object : ViewTreeObserver.OnPreDrawListener {
                override fun onPreDraw(): Boolean {
                    if (!repair()) retire(observer, this)
                    return true
                }
            }
        observer.addOnPreDrawListener(listener)
        observers[observer] = listener
    }

    private fun retire(
        observer: ViewTreeObserver,
        listener: ViewTreeObserver.OnPreDrawListener,
    ) {
        if (observer.isAlive) observer.removeOnPreDrawListener(listener)
        observers.remove(observer)
    }
}
