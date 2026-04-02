package com.swmansion.reanimated.keyboard

import com.facebook.react.bridge.ReactApplicationContext
import java.lang.ref.WeakReference
import java.util.concurrent.ConcurrentHashMap

fun interface NotifyAboutKeyboardChangeFunction {
    fun call()
}

class KeyboardAnimationManager(
    reactContext: WeakReference<ReactApplicationContext>,
) {
    private var mNextListenerId = 0
    private val mListeners = ConcurrentHashMap<Int, KeyboardWorkletWrapper>()
    private val mKeyboard = Keyboard()
    private val mWindowsInsetsManager =
        WindowsInsetsManager(reactContext, mKeyboard, ::notifyAboutKeyboardChange)

    fun subscribeForKeyboardUpdates(
        callback: KeyboardWorkletWrapper,
        isStatusBarTranslucent: Boolean,
        isNavigationBarTranslucent: Boolean,
    ): Int {
        val listenerId = mNextListenerId++
        if (mListeners.isEmpty()) {
            val keyboardAnimationCallback =
                KeyboardAnimationCallback(mKeyboard, ::notifyAboutKeyboardChange, isNavigationBarTranslucent)
            mWindowsInsetsManager.startObservingChanges(keyboardAnimationCallback, isStatusBarTranslucent, isNavigationBarTranslucent)
        }
        mListeners[listenerId] = callback
        return listenerId
    }

    fun unsubscribeFromKeyboardUpdates(listenerId: Int) {
        mListeners.remove(listenerId)
        if (mListeners.isEmpty()) {
            mWindowsInsetsManager.stopObservingChanges()
        }
    }

    fun notifyAboutKeyboardChange() {
        for (listener in mListeners.values) {
            listener.invoke(mKeyboard.getState().asInt(), mKeyboard.getHeight())
        }
    }
}
