package com.swmansion.reanimated

import android.os.SystemClock
import androidx.tracing.Trace
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.ReactChoreographer
import com.facebook.react.uimanager.GuardedFrameCallback
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcherListener
import com.facebook.react.uimanager.events.RCTModernEventEmitter
import com.swmansion.reanimated.nativeProxy.NoopEventHandler
import java.util.ArrayList
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class NodesManager(context: ReactApplicationContext) : EventDispatcherListener {

    interface OnAnimationFrame {
        fun onAnimationFrame(timestampMs: Double)
    }

    private var mFirstUptime: Long = SystemClock.uptimeMillis()
    private var mSlowAnimationsEnabled = false
    private var mAnimationsDragFactor = 0

    private val mEventEmitter: DeviceEventManagerModule.RCTDeviceEventEmitter =
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    private val mReactChoreographer: ReactChoreographer
    private val mChoreographerCallback: GuardedFrameCallback
    val mCustomEventNamesResolver: UIManagerModule.CustomEventNamesResolver
    private val mCallbackPosted = AtomicBoolean()
    private var mCustomEventHandler: RCTModernEventEmitter = NoopEventHandler()
    private var mFrameCallbacks: MutableList<OnAnimationFrame> = ArrayList()
    private val mEventQueue = ConcurrentLinkedQueue<CopiedEvent>()
    private var lastFrameTimeMs = 0.0
    private var mFabricUIManager: FabricUIManager
    private val mDrawPassDetector: DrawPassDetector

    private var mNativeProxy: NativeProxy? = null

    fun getNativeProxy(): NativeProxy? = mNativeProxy

    init {
        context.assertOnJSQueueThread()

        val uiManager = UIManagerHelper.getUIManager(context, UIManagerType.FABRIC)
        assert(uiManager != null)
        mCustomEventNamesResolver = UIManagerModule.CustomEventNamesResolver { eventName ->
            uiManager!!.resolveCustomDirectEventName(eventName)
        }
        mDrawPassDetector = DrawPassDetector(context)

        mReactChoreographer = ReactChoreographer.getInstance()
        mChoreographerCallback =
            object : GuardedFrameCallback(context) {
                override fun doFrameGuarded(frameTimeNanos: Long) {
                    onAnimationFrame(frameTimeNanos)
                }
            }

        mNativeProxy = NativeProxy(context, this)
        mFabricUIManager = uiManager as FabricUIManager
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
                ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE, mChoreographerCallback
            )
        }
    }

    private fun stopUpdatingOnAnimationFrame() {
        if (mCallbackPosted.getAndSet(false)) {
            mReactChoreographer.removeFrameCallback(
                ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE, mChoreographerCallback
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
        if (isInDrawPass()) {
            performNonLayoutOperations()
            startUpdatingOnAnimationFrame()
            return
        }

        performOperations()
    }

    internal fun isInDrawPass(): Boolean = mDrawPassDetector.isInDrawPass()

    private fun onAnimationFrame(frameTimeNanos: Long) {
        UiThreadUtil.assertOnUiThread()

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
            }

            mCallbackPosted.set(false)
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

            if (mNativeProxy == null) {
                return
            }
            // Events can be dispatched from any thread so we have to make sure handleEvent is run from
            // the UI thread.
            if (UiThreadUtil.isOnUiThread()) {
                handleEvent(event)
                performOperationsRespectingDrawPass()
            } else {
                val eventName = mCustomEventNamesResolver.resolveCustomEventName(event.eventName) ?: return
                val viewTag = event.viewTag
                val shouldSaveEvent = mNativeProxy!!.isAnyHandlerWaitingForEvent(eventName, viewTag)
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
        event.dispatchModern(mCustomEventHandler)
    }

    private fun handleEvent(copiedEvent: CopiedEvent) {
        mCustomEventHandler.receiveEvent(
            copiedEvent.surfaceId,
            copiedEvent.targetTag,
            copiedEvent.eventName,
            copiedEvent.canCoalesceEvent,
            copiedEvent.customCoalesceKey,
            copiedEvent.payload,
            copiedEvent.category,
        )
    }

    fun getEventNameResolver(): UIManagerModule.CustomEventNamesResolver = mCustomEventNamesResolver

    fun registerEventHandler(handler: RCTModernEventEmitter) {
        mCustomEventHandler = handler
    }

    fun sendEvent(name: String, body: WritableMap) {
        mEventEmitter.emit(name, body)
    }

    fun enableSlowAnimations(slowAnimationsEnabled: Boolean, animationsDragFactor: Int) {
        mSlowAnimationsEnabled = slowAnimationsEnabled
        mAnimationsDragFactor = animationsDragFactor
        if (slowAnimationsEnabled) {
            mFirstUptime = SystemClock.uptimeMillis()
        }
    }
}
