package com.swmansion.worklets.runloop

import android.os.SystemClock
import android.view.animation.AnimationUtils
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.ReactChoreographer
import com.facebook.react.uimanager.GuardedFrameCallback
import java.util.concurrent.atomic.AtomicBoolean

class AnimationFrameQueue(
    reactApplicationContext: ReactApplicationContext,
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
    private val mPaused = AtomicBoolean()
    private val mInvalidated = AtomicBoolean()
    private val mFrameCallbacks = mutableListOf<AnimationFrameCallback>()
    private val mDispatchLock = Any()

    // Choreographer locks AnimationUtils to the frame's vsync time before input
    // callbacks and unlocks it after the frame. Input (gestures) runs before this
    // queue, so a read during a gesture sees the same vsync time [executeQueue]
    // will be given. Unlocked, the clock is uptime itself, which is "now", not a
    // frame, and must not be reported. The previous frame's time must not leak out.
    private var cachedAnimationTimeMs = Long.MIN_VALUE
    private var cachedFrameTimestampMs = Double.NaN

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

    /**
     * The timestamp [executeQueue] will pass for the choreographer frame in
     * progress, or null between frames.
     */
    fun getCurrentFrameTimestampMs(): Double? {
        val animationTimeMs = AnimationUtils.currentAnimationTimeMillis()
        // Unlocked, this equals uptime. A locked frame time is the vsync, behind
        // the clock, because callbacks run after vsync.
        if (animationTimeMs >= SystemClock.uptimeMillis()) {
            return null
        }
        if (animationTimeMs == cachedAnimationTimeMs) {
            return cachedFrameTimestampMs
        }
        // Integer milliseconds; [executeQueue] keeps the fractional part of the
        // same vsync. The fraction is under a millisecond and makes the flush
        // slightly later, so a baseline taken here cannot land ahead of it.
        val timestampMs = calculateTimestamp(animationTimeMs * 1_000_000L)
        cachedAnimationTimeMs = animationTimeMs
        cachedFrameTimestampMs = timestampMs
        return timestampMs
    }

    fun enableSlowAnimations(
        slowAnimationsEnabled: Boolean,
        animationsDragFactor: Int,
    ) {
        mSlowAnimationsEnabled = slowAnimationsEnabled
        mAnimationsDragFactor = animationsDragFactor
        cachedAnimationTimeMs = Long.MIN_VALUE
        if (slowAnimationsEnabled) {
            mFirstUptime = SystemClock.uptimeMillis()
        }
    }

    private fun scheduleQueueExecution() {
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
            mCallbackPosted.set(false)
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
