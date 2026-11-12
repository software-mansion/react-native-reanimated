package com.swmansion.reanimated

import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

/** Tracks whether the current UI thread turn is inside a draw pass. */
internal class DrawPassDetector(
    private val mContext: ReactApplicationContext,
) {
    private val mHandler = Handler(Looper.getMainLooper())
    private val mClearRunnable = Runnable { mIsInDrawPass = false }
    private var mIsInDrawPass = false
    private var mDecorView: View? = null

    private val mOnDrawListener =
        ViewTreeObserver.OnDrawListener {
            mIsInDrawPass = true
            mHandler.postAtFrontOfQueue(mClearRunnable)
        }

    fun initialize() {
        val activity = mContext.currentActivity ?: return

        val decorView = activity.window.decorView
        if (decorView === mDecorView) {
            return
        }

        // Decor view has changed (e.g. Activity recreated) — detach from the old one first.
        mDecorView?.let { oldView ->
            val oldObserver = oldView.viewTreeObserver
            if (oldObserver.isAlive) {
                oldObserver.removeOnDrawListener(mOnDrawListener)
            }
            mDecorView = null
        }

        // A new Activity's decor view is not attached yet at its first onResume. On API 24 and 25,
        // draw listeners added before the attach are lost, and the check above would then skip
        // every later retry. The decor view of a destroyed Activity is not attached either.
        if (!decorView.isAttachedToWindow) {
            return
        }

        val observer = decorView.viewTreeObserver
        if (!observer.isAlive) {
            return
        }

        mDecorView = decorView
        observer.addOnDrawListener(mOnDrawListener)
    }

    fun isInDrawPass(): Boolean = mIsInDrawPass

    fun invalidate() {
        if (UiThreadUtil.isOnUiThread()) {
            invalidateOnUiThread()
        } else {
            mHandler.post { invalidateOnUiThread() }
        }
    }

    private fun invalidateOnUiThread() {
        mDecorView?.let { view ->
            val observer = view.viewTreeObserver
            if (observer.isAlive) {
                observer.removeOnDrawListener(mOnDrawListener)
            }
            mDecorView = null
        }
        mHandler.removeCallbacks(mClearRunnable)
        mIsInDrawPass = false
    }
}
