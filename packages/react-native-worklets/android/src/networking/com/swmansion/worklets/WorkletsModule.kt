package com.swmansion.worklets

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableNativeArray
import com.facebook.react.bridge.ReadableNativeMap
import com.facebook.react.bridge.queue.MessageQueueThread
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl
import com.facebook.soloader.SoLoader
import com.swmansion.worklets.runloop.AnimationFrameCallback
import com.swmansion.worklets.runloop.AnimationFrameQueue
import java.util.concurrent.atomic.AtomicBoolean

@Suppress("KotlinJniMissingFunction")
@ReactModule(name = WorkletsModule.NAME)
class WorkletsModule(
    reactContext: ReactApplicationContext,
) : NativeWorkletsModuleSpec(reactContext),
    LifecycleEventListener {
    companion object {
        const val NAME = "WorkletsModule"

        init {
            SoLoader.loadLibrary("worklets")
        }
    }

    @field:DoNotStrip
    @Suppress("unused")
    private var mHybridData: HybridData? = null

    @Suppress("unused")
    protected fun getHybridData(): HybridData? = mHybridData

    init {
        reactContext.assertOnJSQueueThread()
    }

    private val mMessageQueueThread = WorkletsMessageQueueThread()
    private val mAndroidUIScheduler = AndroidUIScheduler(reactContext)
    private val mAnimationFrameQueue = AnimationFrameQueue(reactContext)
    private val mWorkletsNetworking = WorkletsNetworking()
    private var mSlowAnimationsEnabled = false

    /**
     * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it doesn't
     * cost us much to add synchronization for extra safety.
     */
    private val mInvalidated = AtomicBoolean(false)

    @OptIn(FrameworkAPI::class)
    private external fun initHybrid(
        bundleModeEnabled: Boolean,
        jsContext: Long,
        messageQueueThread: MessageQueueThread,
        jsCallInvokerHolder: CallInvokerHolderImpl,
        androidUIScheduler: AndroidUIScheduler,
        scriptBufferWrapper: ScriptBufferWrapper?,
    ): HybridData

    @OptIn(FrameworkAPI::class)
    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun installTurboModule(bundleModeEnabled: Boolean): Boolean {
        val context = reactApplicationContext

        context.assertOnJSQueueThread()

        val jsContext = checkNotNull(context.javaScriptContextHolder).get()
        val jsCallInvokerHolder = context.jsCallInvokerHolder as CallInvokerHolderImpl

        val sourceURL = context.sourceURL

        val scriptBufferWrapper: ScriptBufferWrapper? =
            if (bundleModeEnabled) {
                ScriptBufferWrapper(sourceURL!!, context.assets)
            } else {
                null
            }

        mHybridData =
            initHybrid(
                bundleModeEnabled,
                jsContext,
                mMessageQueueThread,
                jsCallInvokerHolder,
                mAndroidUIScheduler,
                scriptBufferWrapper,
            )
        return true
    }

    @OptIn(FrameworkAPI::class)
    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun start(): Boolean {
        reactApplicationContext.assertOnJSQueueThread()
        startCpp()
        return true
    }

    fun abortRequest(
        runtimeId: Int,
        requestIdAsDouble: Double,
    ) {
        mWorkletsNetworking.jsiAbortRequest(runtimeId, requestIdAsDouble)
    }

    fun clearCookies(callback: Callback) {
        mWorkletsNetworking.jsiClearCookies(callback)
    }

    fun sendRequest(
        runtimeWrapper: WorkletRuntimeWrapper,
        method: String,
        url: String,
        requestIdAsDouble: Double,
        headers: ReadableNativeArray,
        data: ReadableNativeMap,
        responseType: String,
        useIncrementalUpdates: Boolean,
        timeoutAsDouble: Double,
        withCredentials: Boolean,
    ) {
        mWorkletsNetworking.jsiSendRequest(
            runtimeWrapper,
            method,
            url,
            requestIdAsDouble,
            headers,
            data,
            responseType,
            useIncrementalUpdates,
            timeoutAsDouble,
            withCredentials,
        )
    }

    fun requestAnimationFrame(animationFrameCallback: AnimationFrameCallback) {
        mAnimationFrameQueue.requestAnimationFrame(animationFrameCallback)
    }

    /** @noinspection unused */
    @DoNotStrip
    fun isOnJSQueueThread(): Boolean = reactApplicationContext.isOnJSQueueThread

    fun toggleSlowAnimations() {
        val animationsDragFactor = 10
        mSlowAnimationsEnabled = !mSlowAnimationsEnabled
        mAnimationFrameQueue.enableSlowAnimations(mSlowAnimationsEnabled, animationsDragFactor)
    }

    override fun invalidate() {
        if (mInvalidated.getAndSet(true)) {
            return
        }
        if (mHybridData != null && mHybridData!!.isValid) {
            // We have to destroy extra runtimes when invalidate is called. If we clean
            // it up later instead there's a chance the runtime will retain references
            // to invalidated memory and will crash on its destruction.
            invalidateCpp()
        }
        mAndroidUIScheduler.deactivate()
    }

    private external fun invalidateCpp()

    private external fun startCpp()

    override fun onHostResume() {
        mAnimationFrameQueue.resume()
    }

    override fun onHostPause() {
        mAnimationFrameQueue.pause()
    }

    override fun onHostDestroy() {}
}
