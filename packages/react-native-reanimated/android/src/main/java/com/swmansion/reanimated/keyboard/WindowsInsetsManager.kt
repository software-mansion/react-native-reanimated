package com.swmansion.reanimated.keyboard

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.ReactApplicationContext
import java.lang.ref.WeakReference

class WindowsInsetsManager(
    private val mReactContext: WeakReference<ReactApplicationContext>,
    private val mKeyboard: Keyboard,
    private val mNotifyAboutKeyboardChange: NotifyAboutKeyboardChangeFunction,
) {
    private var mIsStatusBarTranslucent = false
    private var mIsNavigationBarTranslucent = false

    private val missingContextErrorMsg = "Unable to get reference to react activity"

    private fun getCurrentActivity(): Activity? = mReactContext.get()?.currentActivity

    fun startObservingChanges(
        keyboardAnimationCallback: KeyboardAnimationCallback,
        isStatusBarTranslucent: Boolean,
        isNavigationBarTranslucent: Boolean,
    ) {
        mIsStatusBarTranslucent = isStatusBarTranslucent
        mIsNavigationBarTranslucent = isNavigationBarTranslucent
        updateWindowDecor(false)

        val currentActivity = getCurrentActivity()
        if (currentActivity == null) {
            Log.e("Reanimated", missingContextErrorMsg)
            return
        }

        val rootView = currentActivity.window.decorView
        ViewCompat.setOnApplyWindowInsetsListener(rootView, ::onApplyWindowInsetsListener)
        ViewCompat.setWindowInsetsAnimationCallback(rootView, keyboardAnimationCallback)
    }

    fun stopObservingChanges() {
        updateWindowDecor(!mIsStatusBarTranslucent && !mIsNavigationBarTranslucent)
        updateInsets(0, 0)

        val currentActivity = getCurrentActivity()
        if (currentActivity == null) {
            Log.e("Reanimated", missingContextErrorMsg)
            return
        }

        val rootView = currentActivity.window.decorView
        ViewCompat.setWindowInsetsAnimationCallback(rootView, null)
        ViewCompat.setOnApplyWindowInsetsListener(rootView, null)
    }

    private fun updateWindowDecor(decorFitsSystemWindow: Boolean) {
        Handler(Looper.getMainLooper()).post {
            val currentActivity = getCurrentActivity()
            if (currentActivity == null) {
                Log.e("Reanimated", missingContextErrorMsg)
                return@post
            }
            WindowCompat.setDecorFitsSystemWindows(currentActivity.window, decorFitsSystemWindow)
        }
    }

    private fun onApplyWindowInsetsListener(
        view: View,
        insets: WindowInsetsCompat,
    ): WindowInsetsCompat {
        val defaultInsets = ViewCompat.onApplyWindowInsets(view, insets)
        if (mKeyboard.getState() == KeyboardState.OPEN) {
            mKeyboard.updateHeight(insets, mIsNavigationBarTranslucent)
            mNotifyAboutKeyboardChange.call()
        }
        setWindowInsets(defaultInsets)
        return defaultInsets
    }

    private fun setWindowInsets(insets: WindowInsetsCompat) {
        val systemBarsTypeMask = WindowInsetsCompat.Type.systemBars()
        val paddingTop = insets.getInsets(systemBarsTypeMask).top
        val paddingBottom = insets.getInsets(systemBarsTypeMask).bottom
        updateInsets(paddingTop, paddingBottom)
    }

    private fun updateInsets(
        paddingTop: Int,
        paddingBottom: Int,
    ) {
        Handler(Looper.getMainLooper()).post {
            val params = getLayoutParams(paddingTop, paddingBottom)
            val actionBarId = androidx.appcompat.R.id.action_bar_root

            val currentActivity = getCurrentActivity()
            if (currentActivity == null) {
                Log.e("Reanimated", missingContextErrorMsg)
                return@post
            }

            val actionBarRootView = currentActivity.window.decorView.findViewById<View>(actionBarId)
            actionBarRootView.layoutParams = params
        }
    }

    private fun getLayoutParams(
        paddingTop: Int,
        paddingBottom: Int,
    ): FrameLayout.LayoutParams {
        val matchParentFlag = FrameLayout.LayoutParams.MATCH_PARENT
        val params = FrameLayout.LayoutParams(matchParentFlag, matchParentFlag)
        params.setMargins(
            0,
            if (mIsStatusBarTranslucent) 0 else paddingTop,
            0,
            if (mIsNavigationBarTranslucent) 0 else paddingBottom,
        )
        return params
    }
}
