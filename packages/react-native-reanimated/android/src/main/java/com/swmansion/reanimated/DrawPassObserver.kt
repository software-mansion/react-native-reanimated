package com.swmansion.reanimated

import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

/** Observes the draw passes of the window of the current Activity. */
internal class DrawPassObserver(
    private val mContext: ReactApplicationContext,
    private val mOnBeforeDrawPass: () -> Unit,
) {
    private val mHandler = Handler(Looper.getMainLooper())
    private val mClearRunnable = Runnable { mIsInDrawPass = false }
    private var mIsInDrawPass = false
    private var mDecorView: View? = null

    private val mOnPreDrawListener =
        ViewTreeObserver.OnPreDrawListener {
            mOnBeforeDrawPass()
            true
        }

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

        stopObservingDecorView()

        val observer = decorView.viewTreeObserver
        if (!observer.isAlive) {
            return
        }

        mDecorView = decorView
        observer.addOnPreDrawListener(mOnPreDrawListener)
        observer.addOnDrawListener(mOnDrawListener)
    }

    fun isInDrawPass(): Boolean = mIsInDrawPass

    fun requestDrawPass() {
        mDecorView?.invalidate()
    }

    fun invalidate() {
        if (UiThreadUtil.isOnUiThread()) {
            invalidateOnUiThread()
        } else {
            mHandler.post { invalidateOnUiThread() }
        }
    }

    private fun invalidateOnUiThread() {
        stopObservingDecorView()
        mHandler.removeCallbacks(mClearRunnable)
        mIsInDrawPass = false
    }

    private fun stopObservingDecorView() {
        mDecorView?.let { view ->
            val observer = view.viewTreeObserver
            if (observer.isAlive) {
                observer.removeOnPreDrawListener(mOnPreDrawListener)
                observer.removeOnDrawListener(mOnDrawListener)
            }
            mDecorView = null
        }
    }
}
