package com.swmansion.worklets.runloop

import android.os.SystemClock
import com.facebook.react.bridge.GuardedRunnable
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.modules.core.ReactChoreographer
import com.facebook.react.uimanager.GuardedFrameCallback
import java.util.concurrent.atomic.AtomicBoolean

class AnimationFrameQueue(
    private val reactApplicationContext: ReactApplicationContext,
) {
    private var mFirstUptime = SystemClock.uptimeMillis()
    private var mSlowAnimationsEnabled = false
    private var lastFrameTimeMs = 0.0
    private var mAnimationsDragFactor = 1

    // ReactChoreographer is
    // [thread safe](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/core/ReactChoreographer.kt#L21).
    private val mReactChoreographer: ReactChoreographer = ReactChoreographer.getInstance()
    private val mChoreographerCallback: GuardedFrameCallback =
        object : GuardedFrameCallback(reactApplicationContext) {
            override fun doFrameGuarded(frameTimeNanos: Long) {
                executeQueue(frameTimeNanos)
            }
        }
    private val mCallbackPosted = AtomicBoolean()
    private val mScheduleOnUIThreadPosted = AtomicBoolean()
    private val mPaused = AtomicBoolean(true)
    private val mInvalidated = AtomicBoolean()
    private val mFrameCallbacks = mutableListOf<AnimationFrameCallback>()
    private val mDispatchLock = Any()

    fun resume() {
        if (mPaused.getAndSet(false)) {
            scheduleQueueExecution()
        }
    }

    fun pause() {
        synchronized(mPaused) {
            if (!mPaused.getAndSet(true) && mCallbackPosted.getAndSet(false)) {
                mReactChoreographer.removeFrameCallback(
                    ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
                    mChoreographerCallback,
                )
            }
        }
    }

    fun invalidate() {
        mInvalidated.set(true)
        removePostedFrameCallback()
        synchronized(mDispatchLock) {
            synchronized(mFrameCallbacks) {
                mFrameCallbacks.clear()
            }
        }
    }

    fun requestAnimationFrame(animationFrameCallback: AnimationFrameCallback) {
        synchronized(mFrameCallbacks) {
            if (mInvalidated.get()) {
                return
            }
            mFrameCallbacks.add(animationFrameCallback)
        }
        scheduleQueueExecution()
    }

    fun enableSlowAnimations(
        slowAnimationsEnabled: Boolean,
        animationsDragFactor: Int,
    ) {
        mSlowAnimationsEnabled = slowAnimationsEnabled
        mAnimationsDragFactor = animationsDragFactor
        if (slowAnimationsEnabled) {
            mFirstUptime = SystemClock.uptimeMillis()
        }
    }

    private fun scheduleQueueExecution() {
        // ReactChoreographer holds the lock of its callback queues while it runs a frame on the UI thread, and the
        // frame can wait for the UI runtime, for example when a view mounts and sends an event to a worklet handler.
        // A caller on another thread can hold the UI runtime (runOnUISync), so it must not wait for that lock.
        if (!UiThreadUtil.isOnUiThread()) {
            if (!mScheduleOnUIThreadPosted.getAndSet(true)) {
                UiThreadUtil.runOnUiThread(
                    object : GuardedRunnable(reactApplicationContext.exceptionHandler) {
                        override fun runGuarded() {
                            mScheduleOnUIThreadPosted.set(false)
                            scheduleQueueExecution()
                        }
                    },
                )
            }
            return
        }
        synchronized(mPaused) {
            if (mInvalidated.get()) {
                return
            }
            if (!mPaused.get() && !mCallbackPosted.getAndSet(true)) {
                mReactChoreographer.postFrameCallback(
                    ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
                    mChoreographerCallback,
                )
            }
        }
    }

    private fun removePostedFrameCallback() {
        if (mCallbackPosted.getAndSet(false)) {
            mReactChoreographer.removeFrameCallback(
                ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
                mChoreographerCallback,
            )
        }
    }

    private fun executeQueue(frameTimeNanos: Long) {
        val currentFrameTimeMs = calculateTimestamp(frameTimeNanos)
        if (currentFrameTimeMs <= lastFrameTimeMs) {
            // It is possible for ChoreographerCallback to be executed twice within the same frame
            // due to frame drops. If this occurs, the additional callback execution should be ignored.
            mCallbackPosted.set(false)
            scheduleQueueExecution()
            return
        }

        synchronized(mDispatchLock) {
            val frameCallbacks = pullCallbacks()
            if (mInvalidated.get()) {
                return
            }

            lastFrameTimeMs = currentFrameTimeMs
            for (callback in frameCallbacks) {
                if (mInvalidated.get()) {
                    break
                }
                callback.onAnimationFrame(currentFrameTimeMs)
            }
        }
    }

    private fun pullCallbacks(): List<AnimationFrameCallback> {
        synchronized(mFrameCallbacks) {
            val frameCallbacks = mFrameCallbacks.toList()
            mFrameCallbacks.clear()
            mCallbackPosted.set(false)
            return frameCallbacks
        }
    }

    private fun calculateTimestamp(frameTimeNanos: Long): Double {
        val nanosecondsInMilliseconds = 1000000.0
        var currentFrameTimeMs = frameTimeNanos / nanosecondsInMilliseconds
        if (mSlowAnimationsEnabled) {
            currentFrameTimeMs =
                mFirstUptime + (currentFrameTimeMs - mFirstUptime) / mAnimationsDragFactor
        }
        return currentFrameTimeMs
    }
}
