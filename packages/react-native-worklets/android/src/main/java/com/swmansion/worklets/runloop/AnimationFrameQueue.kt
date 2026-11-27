package com.swmansion.worklets.runloop

import android.os.SystemClock
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.GuardedFrameCallback
import java.util.concurrent.atomic.AtomicBoolean

class AnimationFrameQueue(
    reactApplicationContext: ReactApplicationContext,
    private val mFrameSource: FrameSource = ReactChoreographerFrameSource(),
) {
    private class SlowAnimationsConfig(
        val enabled: Boolean,
        val dragFactor: Int,
        val firstUptime: Long,
    )

    /**
     * Written by the thread that toggles slow animations and read by the frame thread, so it is
     * replaced as a whole.
     */
    @Volatile
    private var mSlowAnimationsConfig = SlowAnimationsConfig(false, 1, SystemClock.uptimeMillis())
    private var lastFrameTimeMs = 0.0

    private val mChoreographerCallback: GuardedFrameCallback =
        object : GuardedFrameCallback(reactApplicationContext) {
            override fun doFrameGuarded(frameTimeNanos: Long) {
                executeQueue(frameTimeNanos)
            }
        }
    private val mCallbackPosted = AtomicBoolean()
    private val mPaused = AtomicBoolean(true)
    private val mInvalidated = AtomicBoolean()
    private val mFrameCallbacks = mutableListOf<AnimationFrameCallback>()
    private val mDispatchLock = Any()

    fun resume() {
        if (mPaused.getAndSet(false) && hasFrameCallbacks()) {
            scheduleQueueExecution()
        }
    }

    fun pause() {
        synchronized(mPaused) {
            if (!mPaused.getAndSet(true) && mCallbackPosted.getAndSet(false)) {
                mFrameSource.removeFrameCallback(mChoreographerCallback)
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
        mFrameSource.invalidate()
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
        firstUptime: Long = SystemClock.uptimeMillis(),
    ) {
        mSlowAnimationsConfig =
            SlowAnimationsConfig(
                slowAnimationsEnabled,
                animationsDragFactor,
                if (slowAnimationsEnabled) firstUptime else mSlowAnimationsConfig.firstUptime,
            )
    }

    private fun scheduleQueueExecution() {
        synchronized(mPaused) {
            if (mInvalidated.get()) {
                return
            }
            if (!mPaused.get() && !mCallbackPosted.getAndSet(true)) {
                mFrameSource.postFrameCallback(mChoreographerCallback)
            }
        }
    }

    private fun removePostedFrameCallback() {
        if (mCallbackPosted.getAndSet(false)) {
            mFrameSource.removeFrameCallback(mChoreographerCallback)
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

    private fun hasFrameCallbacks(): Boolean {
        synchronized(mFrameCallbacks) {
            return mFrameCallbacks.isNotEmpty()
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
        val config = mSlowAnimationsConfig
        if (config.enabled) {
            currentFrameTimeMs =
                config.firstUptime + (currentFrameTimeMs - config.firstUptime) / config.dragFactor
        }
        return currentFrameTimeMs
    }
}
