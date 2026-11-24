package com.swmansion.worklets

import android.os.SystemClock
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl
import com.facebook.soloader.SoLoader
import com.swmansion.worklets.networking.Networking
import com.swmansion.worklets.runloop.AnimationFrameCallback
import com.swmansion.worklets.runloop.AnimationFrameQueue
import com.swmansion.worklets.runloop.DedicatedThreadFrameSource

@Suppress("KotlinJniMissingFunction")
@ReactModule(name = WorkletsModule.NAME, needsEagerInit = true)
class WorkletsModule(
    reactContext: ReactApplicationContext,
) : NativeWorkletsModuleSpec(reactContext),
    LifecycleEventListener,
    HeadlessJsTaskEventListener {
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

    private val mAndroidUIScheduler = AndroidUIScheduler(reactContext)
    private val mAnimationFrameQueue = AnimationFrameQueue(reactContext)
    private val mVSyncFrameQueue =
        AnimationFrameQueue(reactContext, DedicatedThreadFrameSource())
    private val mNetworking = Networking()
    private var mSlowAnimationsEnabled = false
    private var mHostResumed = false

    /**
     * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it doesn't
     * cost us much to add synchronization for extra safety.
     */
    private val mInvalidationLock = Any()
    private var mInvalidated = false

    @OptIn(FrameworkAPI::class)
    private external fun initHybrid(
        jsContext: Long,
        jsCallInvokerHolder: CallInvokerHolderImpl,
        androidUIScheduler: AndroidUIScheduler,
        networking: Networking,
    ): HybridData

    private external fun prepareProxyCpp()

    private external fun beginBundleModeAOTCpp()

    private external fun prepareBundleModeAOTCpp()

    private external fun installTurboModuleCpp(bundleModeEnabled: Boolean)

    @OptIn(FrameworkAPI::class)
    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun prepareBundleMode(): Boolean {
        reactApplicationContext.assertOnJSQueueThread()
        beginBundleModeAOTCpp()
        Thread({ prepareBundleModeAOTCpp() }, "WorkletsBundleModePrepare").start()
        return true
    }

    @OptIn(FrameworkAPI::class)
    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun installTurboModule(bundleModeEnabled: Boolean): Boolean {
        reactApplicationContext.assertOnJSQueueThread()
        installTurboModuleCpp(bundleModeEnabled)
        return true
    }

    @OptIn(FrameworkAPI::class)
    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun start(): Boolean {
        reactApplicationContext.assertOnJSQueueThread()
        startCpp()
        return true
    }

    @DoNotStrip
    fun requestAnimationFrame(animationFrameCallback: AnimationFrameCallback) {
        mAnimationFrameQueue.requestAnimationFrame(animationFrameCallback)
    }

    @DoNotStrip
    fun requestVSync(animationFrameCallback: AnimationFrameCallback) {
        mVSyncFrameQueue.requestAnimationFrame(animationFrameCallback)
    }

    /** @noinspection unused */
    @DoNotStrip
    fun isOnJSQueueThread(): Boolean = reactApplicationContext.isOnJSQueueThread

    /** @noinspection unused */
    @DoNotStrip
    fun createScriptBufferWrapper(): ScriptBufferWrapper = ScriptBufferWrapper(reactApplicationContext.sourceURL, reactApplicationContext)

    fun toggleSlowAnimations() {
        val animationsDragFactor = 10
        mSlowAnimationsEnabled = !mSlowAnimationsEnabled
        val firstUptime = SystemClock.uptimeMillis()
        mAnimationFrameQueue.enableSlowAnimations(mSlowAnimationsEnabled, animationsDragFactor, firstUptime)
        mVSyncFrameQueue.enableSlowAnimations(mSlowAnimationsEnabled, animationsDragFactor, firstUptime)
    }

    @OptIn(FrameworkAPI::class)
    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun toggleSlowAnimationsOnUIRuntime(): Boolean {
        toggleSlowAnimations()
        return mSlowAnimationsEnabled
    }

    override fun initialize() {
        reactApplicationContext.addLifecycleEventListener(this)
        HeadlessJsTaskContext.getInstance(reactApplicationContext).addTaskEventListener(this)
        createHybrid()
        Thread({ prepareProxyCpp() }, "WorkletsProxyPrepare").start()
    }

    override fun invalidate() {
        synchronized(mInvalidationLock) {
            if (mInvalidated) {
                return
            }
            mInvalidated = true
            reactApplicationContext.removeLifecycleEventListener(this)
            HeadlessJsTaskContext
                .getInstance(reactApplicationContext)
                .removeTaskEventListener(this)
        }
        mAnimationFrameQueue.invalidate()
        mVSyncFrameQueue.invalidate()
        if (mHybridData != null && mHybridData!!.isValid) {
            invalidateCpp()
        }
        mAndroidUIScheduler.deactivate()
    }

    private external fun invalidateCpp()

    private external fun startCpp()

    override fun onHostResume() {
        mHostResumed = true
        updateAnimationFrameQueue()
    }

    override fun onHostPause() {
        mHostResumed = false
        updateAnimationFrameQueue()
    }

    override fun onHostDestroy() {}

    override fun onHeadlessJsTaskStart(taskId: Int) {
        updateAnimationFrameQueue()
    }

    override fun onHeadlessJsTaskFinish(taskId: Int) {
        updateAnimationFrameQueue()
    }

    private fun updateAnimationFrameQueue() {
        synchronized(mInvalidationLock) {
            if (mInvalidated) {
                return
            }
            val hasActiveHeadlessTasks =
                HeadlessJsTaskContext.getInstance(reactApplicationContext).hasActiveTasks()
            if (mHostResumed || hasActiveHeadlessTasks) {
                mAnimationFrameQueue.resume()
                mVSyncFrameQueue.resume()
            } else {
                mAnimationFrameQueue.pause()
                mVSyncFrameQueue.pause()
            }
        }
    }

    @OptIn(FrameworkAPI::class)
    private fun createHybrid() {
        val context = reactApplicationContext
        val jsContext =
            checkNotNull(context.javaScriptContextHolder) {
                "[Worklets] JavaScript context is not available yet."
            }.get()
        val jsCallInvokerHolder = context.jsCallInvokerHolder as CallInvokerHolderImpl
        mHybridData = initHybrid(jsContext, jsCallInvokerHolder, mAndroidUIScheduler, mNetworking)
    }
}
