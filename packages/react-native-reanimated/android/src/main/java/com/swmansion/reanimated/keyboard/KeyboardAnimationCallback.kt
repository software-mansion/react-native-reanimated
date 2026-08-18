package com.swmansion.reanimated.keyboard

import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat

class KeyboardAnimationCallback(
    private val mKeyboard: Keyboard,
    private val mNotifyAboutKeyboardChange: NotifyAboutKeyboardChangeFunction,
    private val mIsNavigationBarTranslucent: Boolean,
) : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
    companion object {
        private val CONTENT_TYPE_MASK = WindowInsetsCompat.Type.ime()
    }

    private var mPendingStartDispatch = false

    override fun onStart(
        animation: WindowInsetsAnimationCompat,
        bounds: WindowInsetsAnimationCompat.BoundsCompat,
    ): WindowInsetsAnimationCompat.BoundsCompat {
        if (!isKeyboardAnimation(animation)) {
            return bounds
        }
        mKeyboard.onAnimationStart()
        mPendingStartDispatch = true
        return super.onStart(animation, bounds)
    }

    override fun onProgress(
        insets: WindowInsetsCompat,
        runningAnimations: List<WindowInsetsAnimationCompat>,
    ): WindowInsetsCompat {
        var isAnyKeyboardAnimationRunning = false
        for (animation in runningAnimations) {
            if (isKeyboardAnimation(animation)) {
                isAnyKeyboardAnimationRunning = true
                break
            }
        }
        if (isAnyKeyboardAnimationRunning) {
            mPendingStartDispatch = false
            mKeyboard.updateHeight(insets, mIsNavigationBarTranslucent)
            mNotifyAboutKeyboardChange.call()
        }
        return insets
    }

    override fun onEnd(animation: WindowInsetsAnimationCompat) {
        if (isKeyboardAnimation(animation)) {
            if (mPendingStartDispatch) {
                mNotifyAboutKeyboardChange.call()
            }
            mPendingStartDispatch = false
            mKeyboard.onAnimationEnd()
            mNotifyAboutKeyboardChange.call()
        }
    }

    private fun isKeyboardAnimation(animation: WindowInsetsAnimationCompat): Boolean = (animation.typeMask and CONTENT_TYPE_MASK) != 0
}
