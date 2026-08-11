package com.swmansion.worklets.runloop

import android.os.SystemClock
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.ReactChoreographer
import com.facebook.react.uimanager.GuardedFrameCallback
import java.util.concurrent.atomic.AtomicBoolean

class AnimationFrameQueue(
    reactApplicationContext: ReactApplicationContext,
) {
    private var mVirtualBaseMs = SystemClock.uptimeMillis().toDouble()
    private var mRealBaseMs = mVirtualBaseMs
    private var lastFrameTimeMs = 0.0
    private var mAnimationsDragFactor = 1.0

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
    private val mPaused = AtomicBoolean()
    private val mFrameCallbacks = mutableListOf<AnimationFrameCallback>()

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

    fun requestAnimationFrame(animationFrameCallback: AnimationFrameCallback) {
        synchronized(mFrameCallbacks) {
            mFrameCallbacks.add(animationFrameCallback)
        }
        scheduleQueueExecution()
    }

    fun enableSlowAnimations(
        slowAnimationsEnabled: Boolean,
        animationsDragFactor: Int,
    ) {
        // The virtual clock is rebased on every toggle so it stays continuous
        // and ongoing animations don't jump.
        val nowMs = SystemClock.uptimeMillis().toDouble()
        mVirtualBaseMs += (nowMs - mRealBaseMs) / mAnimationsDragFactor
        mRealBaseMs = nowMs
        mAnimationsDragFactor = if (slowAnimationsEnabled) animationsDragFactor.toDouble() else 1.0
    }

    private fun scheduleQueueExecution() {
        synchronized(mPaused) {
            if (!mPaused.get() && !mCallbackPosted.getAndSet(true)) {
                mReactChoreographer.postFrameCallback(
                    ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
                    mChoreographerCallback,
                )
            }
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

        val frameCallbacks = pullCallbacks()
        mCallbackPosted.set(false)

        lastFrameTimeMs = currentFrameTimeMs
        for (callback in frameCallbacks) {
            callback.onAnimationFrame(currentFrameTimeMs)
        }
    }

    private fun pullCallbacks(): List<AnimationFrameCallback> {
        synchronized(mFrameCallbacks) {
            val frameCallbacks = mFrameCallbacks.toList()
            mFrameCallbacks.clear()
            return frameCallbacks
        }
    }

    private fun calculateTimestamp(frameTimeNanos: Long): Double {
        val nanosecondsInMilliseconds = 1000000.0
        val currentFrameTimeMs = frameTimeNanos / nanosecondsInMilliseconds
        return mVirtualBaseMs + (currentFrameTimeMs - mRealBaseMs) / mAnimationsDragFactor
    }
}
