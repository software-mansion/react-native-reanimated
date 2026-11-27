package com.swmansion.worklets.runloop

import android.os.Handler
import android.os.HandlerThread
import android.view.Choreographer
import com.facebook.react.modules.core.ReactChoreographer

interface FrameSource {
    fun postFrameCallback(callback: Choreographer.FrameCallback)

    fun removeFrameCallback(callback: Choreographer.FrameCallback)

    fun invalidate()
}

/**
 * Delivers frames on the UI thread.
 *
 * ReactChoreographer is
 * [thread safe](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/core/ReactChoreographer.kt#L21).
 */
class ReactChoreographerFrameSource : FrameSource {
    private val mReactChoreographer: ReactChoreographer = ReactChoreographer.getInstance()

    override fun postFrameCallback(callback: Choreographer.FrameCallback) {
        mReactChoreographer.postFrameCallback(
            ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
            callback,
        )
    }

    override fun removeFrameCallback(callback: Choreographer.FrameCallback) {
        mReactChoreographer.removeFrameCallback(
            ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
            callback,
        )
    }

    override fun invalidate() {}
}

/**
 * Delivers frames on its own thread, so they keep coming while the UI thread is blocked.
 *
 * A Choreographer belongs to the Looper thread that asks for it, so every call goes through the
 * handler of that thread. The thread starts with the first posted callback.
 */
class DedicatedThreadFrameSource : FrameSource {
    private val mLock = Any()
    private var mThread: HandlerThread? = null
    private var mHandler: Handler? = null
    private var mInvalidated = false

    override fun postFrameCallback(callback: Choreographer.FrameCallback) {
        getHandler()?.post { Choreographer.getInstance().postFrameCallback(callback) }
    }

    override fun removeFrameCallback(callback: Choreographer.FrameCallback) {
        getHandler()?.post { Choreographer.getInstance().removeFrameCallback(callback) }
    }

    override fun invalidate() {
        synchronized(mLock) {
            mInvalidated = true
            mThread?.quitSafely()
            mThread = null
            mHandler = null
        }
    }

    private fun getHandler(): Handler? {
        synchronized(mLock) {
            if (mInvalidated) {
                return null
            }
            mHandler?.let { return it }
            val thread = HandlerThread("WorkletsFrameSource")
            thread.start()
            val handler = Handler(thread.looper)
            mThread = thread
            mHandler = handler
            return handler
        }
    }
}
