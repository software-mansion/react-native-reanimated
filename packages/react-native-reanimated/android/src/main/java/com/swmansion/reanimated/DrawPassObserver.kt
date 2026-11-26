package com.swmansion.reanimated

import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import android.view.inspector.WindowInspector
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import java.util.Collections
import java.util.WeakHashMap

internal class DrawPassObserver(
    private val mContext: ReactApplicationContext,
    private val mOnBeforeDrawPass: () -> Unit,
) {
    private val mHandler = Handler(Looper.getMainLooper())
    private val mClearRunnable = Runnable { mIsInDrawPass = false }
    private var mIsInDrawPass = false
    private var mDecorView: View? = null
    private val mPreDrawObservers: MutableSet<ViewTreeObserver> = Collections.newSetFromMap(WeakHashMap())

    private val mOnPreDrawListener =
        ViewTreeObserver.OnPreDrawListener {
            try {
                mOnBeforeDrawPass()
            } catch (exception: RuntimeException) {
                mContext.handleException(exception)
            }
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
        if (decorView === mDecorView || !decorView.isAttachedToWindow) {
            return
        }

        stopObservingDecorView()

        val observer = decorView.viewTreeObserver
        mDecorView = decorView
        observer.addOnDrawListener(mOnDrawListener)
        observePreDraw(observer)
    }

    fun isInDrawPass(): Boolean = mIsInDrawPass

    fun requestDrawPass() {
        // A dialog has its own window, and so its own pre-draw callback.
        for (rootView in windowRootViews()) {
            if (rootView.windowVisibility == View.VISIBLE) {
                observePreDraw(rootView.viewTreeObserver)
                rootView.invalidate()
            }
        }
    }

    fun invalidate() {
        if (UiThreadUtil.isOnUiThread()) {
            invalidateOnUiThread()
        } else {
            mHandler.post { invalidateOnUiThread() }
        }
    }

    private fun observePreDraw(observer: ViewTreeObserver) {
        if (mPreDrawObservers.add(observer)) {
            observer.addOnPreDrawListener(mOnPreDrawListener)
        }
    }

    private fun windowRootViews(): List<View> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            WindowInspector.getGlobalWindowViews()
        } else {
            listOfNotNull(mDecorView)
        }

    private fun invalidateOnUiThread() {
        stopObservingDecorView()
        for (observer in mPreDrawObservers) {
            if (observer.isAlive) {
                observer.removeOnPreDrawListener(mOnPreDrawListener)
            }
        }
        mPreDrawObservers.clear()
        mHandler.removeCallbacks(mClearRunnable)
        mIsInDrawPass = false
    }

    private fun stopObservingDecorView() {
        mDecorView?.let { view ->
            val observer = view.viewTreeObserver
            if (observer.isAlive) {
                observer.removeOnDrawListener(mOnDrawListener)
            }
            mDecorView = null
        }
    }
}
