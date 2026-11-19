package com.swmansion.reanimated

import android.os.SystemClock
import androidx.tracing.Trace
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.modules.core.ReactChoreographer
import com.facebook.react.uimanager.GuardedFrameCallback
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcherListener
import com.swmansion.reanimated.nativeProxy.EventHandler
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class NodesManager(
    context: ReactApplicationContext,
) : EventDispatcherListener {
    interface OnAnimationFrame {
        fun onAnimationFrame(timestampMs: Double)
    }

    private var mFirstUptime: Long = SystemClock.uptimeMillis()
    private var mSlowAnimationsEnabled = false
    private var mAnimationsDragFactor = 0

    private val mReactChoreographer: ReactChoreographer
    private val mChoreographerCallback: GuardedFrameCallback
    private val mCallbackPosted = AtomicBoolean()
    private var mCustomEventHandler: EventHandler? = null
    private var mFrameCallbacks: MutableList<OnAnimationFrame> = ArrayList()
    private val mEventQueue = ConcurrentLinkedQueue<CopiedEvent>()
    private var lastFrameTimeMs = 0.0
    private val mFabricUIManager = UIManagerHelper.getUIManager(context, UIManagerType.FABRIC) as FabricUIManager
    private val mDrawPassDetector: DrawPassDetector

    private var mNativeProxy: NativeProxy? = null

    fun getNativeProxy(): NativeProxy? = mNativeProxy

    init {
        context.assertOnJSQueueThread()

        mDrawPassDetector = DrawPassDetector(context)

        mReactChoreographer = ReactChoreographer.getInstance()
        mChoreographerCallback =
            object : GuardedFrameCallback(context) {
                override fun doFrameGuarded(frameTimeNanos: Long) {
                    onAnimationFrame(frameTimeNanos)
                }
            }

        mNativeProxy = NativeProxy(context, this)
        mFabricUIManager.eventDispatcher.addListener(this)
    }

    fun invalidate() {
        mNativeProxy?.let {
            it.invalidate()
            mNativeProxy = null
        }

        mDrawPassDetector.invalidate()

        mFabricUIManager.eventDispatcher.removeListener(this)
    }

    fun onHostPause() {
        if (mCallbackPosted.get()) {
            stopUpdatingOnAnimationFrame()
            mCallbackPosted.set(true)
        }
    }

    fun isAnimationRunning(): Boolean = mCallbackPosted.get()

    fun onHostResume() {
        if (mCallbackPosted.getAndSet(false)) {
            startUpdatingOnAnimationFrame()
        }
    }

    fun startUpdatingOnAnimationFrame() {
        if (!mCallbackPosted.getAndSet(true)) {
            mReactChoreographer.postFrameCallback(
                ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
                mChoreographerCallback,
            )
        }
    }

    private fun stopUpdatingOnAnimationFrame() {
        if (mCallbackPosted.getAndSet(false)) {
            mReactChoreographer.removeFrameCallback(
                ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
                mChoreographerCallback,
            )
        }
    }

    fun performOperations() {
        UiThreadUtil.assertOnUiThread()
        mNativeProxy?.performOperations()
    }

    internal fun performNonLayoutOperations() {
        UiThreadUtil.assertOnUiThread()
        mNativeProxy?.performNonLayoutOperations()
    }

    internal fun performOperationsRespectingDrawPass() {
        mDrawPassDetector.initialize()
        if (mDrawPassDetector.isInDrawPass()) {
            performNonLayoutOperations()
            startUpdatingOnAnimationFrame()
            return
        }

        performOperations()
    }

    private fun onAnimationFrame(frameTimeNanos: Long) {
        UiThreadUtil.assertOnUiThread()
        // Cleared first, so that an event that this frame causes can request the next frame.
        mCallbackPosted.set(false)

        try {
            if (BuildConfig.REANIMATED_PROFILING) {
                Trace.beginSection("onAnimationFrame")
            }

            mDrawPassDetector.initialize()

            var currentFrameTimeMs = frameTimeNanos / 1000000.0
            if (mSlowAnimationsEnabled) {
                currentFrameTimeMs =
                    mFirstUptime + (currentFrameTimeMs - mFirstUptime) / mAnimationsDragFactor
            }

            if (currentFrameTimeMs > lastFrameTimeMs) {
                // It is possible for ChoreographerCallback to be executed twice within the same frame
                // due to frame drops. If this occurs, the additional callback execution should be ignored.
                lastFrameTimeMs = currentFrameTimeMs

                while (!mEventQueue.isEmpty()) {
                    val copiedEvent = mEventQueue.poll()
                    handleEvent(copiedEvent!!)
                }

                if (mFrameCallbacks.isNotEmpty()) {
                    val frameCallbacks = mFrameCallbacks
                    mFrameCallbacks = ArrayList(frameCallbacks.size)
                    for (i in 0 until frameCallbacks.size) {
                        frameCallbacks[i].onAnimationFrame(currentFrameTimeMs)
                    }
                }

                performOperations()
            } else {
                // The work of the skipped callback, also the layout work of an event, waits for the next frame.
                startUpdatingOnAnimationFrame()
            }

            if (mFrameCallbacks.isNotEmpty() || !mEventQueue.isEmpty()) {
                // enqueue next frame
                startUpdatingOnAnimationFrame()
            }
        } finally {
            if (BuildConfig.REANIMATED_PROFILING) {
                Trace.endSection()
            }
        }
    }

    fun postOnAnimation(onAnimationFrame: OnAnimationFrame) {
        mFrameCallbacks.add(onAnimationFrame)
        startUpdatingOnAnimationFrame()
    }

    override fun onEventDispatch(event: Event<*>) {
        try {
            if (BuildConfig.REANIMATED_PROFILING) {
                Trace.beginSection("onEventDispatch")
            }

            val nativeProxy = mNativeProxy ?: return
            // Events can be dispatched from any thread so we have to make sure handleEvent is run from
            // the UI thread.
            if (UiThreadUtil.isOnUiThread()) {
                // A mount inside the dispatch can break a native transaction of the view that sends the event.
                // The frame is requested first, so that the flushes of the handler also wait for it.
                startUpdatingOnAnimationFrame()
                handleEvent(event)
                performNonLayoutOperations()
            } else {
                val eventName = resolveCustomEventName(event.eventName)
                val viewTag = event.viewTag
                val shouldSaveEvent = nativeProxy.isAnyHandlerWaitingForEvent(eventName, viewTag)
                if (shouldSaveEvent) {
                    mEventQueue.offer(CopiedEvent(event))
                }
                startUpdatingOnAnimationFrame()
            }
        } finally {
            if (BuildConfig.REANIMATED_PROFILING) {
                Trace.endSection()
            }
        }
    }

    private fun handleEvent(event: Event<*>) {
        mCustomEventHandler?.let(event::dispatchModern)
    }

    private fun handleEvent(copiedEvent: CopiedEvent) {
        mCustomEventHandler?.handle(
            copiedEvent.eventName,
            copiedEvent.targetTag,
            copiedEvent.payload,
            isInsideEventDispatch = false,
        )
    }

    fun registerEventHandler(handler: EventHandler) {
        mCustomEventHandler = handler
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
}
