package com.swmansion.reanimated

import android.content.ContentResolver
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.soloader.SoLoader
import com.swmansion.common.GestureHandlerStateManager
import com.swmansion.reanimated.keyboard.KeyboardAnimationManager
import com.swmansion.reanimated.keyboard.KeyboardWorkletWrapper
import com.swmansion.reanimated.nativeProxy.AnimationFrameCallback
import com.swmansion.reanimated.nativeProxy.EventHandler
import com.swmansion.reanimated.nativeProxy.PseudoSelectorCallback
import com.swmansion.reanimated.nativeProxy.SensorSetter
import com.swmansion.reanimated.nativeProxy.SynchronousPropsBufferParser
import com.swmansion.reanimated.pseudoSelectors.PseudoSelectorManager
import com.swmansion.reanimated.sensor.ReanimatedSensorContainer
import com.swmansion.reanimated.sensor.ReanimatedSensorType
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean

@Suppress("KotlinJniMissingFunction")
@OptIn(FrameworkAPI::class)
open class NativeProxy {
    companion object {
        init {
            SoLoader.loadLibrary("reanimated")
        }
    }

    protected var mNodesManager: NodesManager? = null
    protected val mFabricUIManager: FabricUIManager
    protected val mContext: WeakReference<ReactApplicationContext>
    private val reanimatedSensorContainer: ReanimatedSensorContainer
    private val gestureHandlerStateManager: GestureHandlerStateManager?
    private val keyboardAnimationManager: KeyboardAnimationManager
    private val pseudoSelectorManager: PseudoSelectorManager
    private var firstUptime: Long = SystemClock.uptimeMillis()
    private var slowAnimationsEnabled = false
    private val animationsDragFactor = 10

    // It turns out it's pretty difficult to set a member of a class
    // instance through JNI so we decided to use a setter instead.
    @set:DoNotStrip
    @Suppress("unused")
    protected var cppVersion: String? = null

    /**
     * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it
     * doesn't cost us much to add synchronization for extra safety.
     */
    private val mInvalidated = AtomicBoolean(false)

    @field:DoNotStrip
    @Suppress("unused")
    private val mHybridData: HybridData

    constructor(context: ReactApplicationContext, nodesManager: NodesManager) {
        context.assertOnJSQueueThread()

        mContext = WeakReference(context)
        reanimatedSensorContainer = ReanimatedSensorContainer(mContext)
        keyboardAnimationManager = KeyboardAnimationManager(mContext)
        addDevMenuOption()

        var tempHandlerStateManager: GestureHandlerStateManager? = null
        try {
            @Suppress("UNCHECKED_CAST")
            val gestureHandlerModuleClass =
                Class.forName("com.swmansion.gesturehandler.react.RNGestureHandlerModule") as
                    Class<NativeModule>
            tempHandlerStateManager =
                context.getNativeModule(gestureHandlerModuleClass) as
                    GestureHandlerStateManager?
        } catch (e: ClassCastException) {
            tempHandlerStateManager = null
        } catch (e: ClassNotFoundException) {
            tempHandlerStateManager = null
        }
        gestureHandlerStateManager = tempHandlerStateManager
        mNodesManager = nodesManager

        mFabricUIManager =
            UIManagerHelper.getUIManager(context, UIManagerType.FABRIC) as FabricUIManager
        pseudoSelectorManager = PseudoSelectorManager(mFabricUIManager)

        val callInvokerHolder = context.jsCallInvokerHolder as CallInvokerHolderImpl
        mHybridData =
            initHybrid(
                context.javaScriptContextHolder!!.get(),
                callInvokerHolder,
                mFabricUIManager,
            )
        if (BuildConfig.DEBUG) {
            checkCppVersion() // injectCppVersion should be called during initHybrid above
        }
    }

    private external fun initHybrid(
        jsContext: Long,
        jsCallInvokerHolder: CallInvokerHolderImpl,
        fabricUIManager: FabricUIManager,
    ): HybridData

    external fun isAnyHandlerWaitingForEvent(
        eventName: String,
        emitterReactTag: Int,
    ): Boolean

    external fun performOperations()

    external fun performNonLayoutOperations()

    external fun installJSIBindings()

    private external fun invalidateCpp()

    external fun toggleSlowAnimationsOnUIRuntime()

    protected fun getHybridData(): HybridData = mHybridData

    fun invalidate() {
        if (mInvalidated.getAndSet(true)) {
            return
        }
        if (mHybridData.isValid) {
            invalidateCpp()
        }
    }

    private fun toggleSlowAnimations() {
        slowAnimationsEnabled = !slowAnimationsEnabled
        if (slowAnimationsEnabled) {
            firstUptime = SystemClock.uptimeMillis()
        }
        mNodesManager!!.enableSlowAnimations(slowAnimationsEnabled, animationsDragFactor)
        toggleSlowAnimationsOnUIRuntime()
    }

    private fun addDevMenuOption() {
        // In Expo, `ApplicationContext` is not an instance of `ReactApplication`
        DevMenuUtils.addDevMenuOption(mContext.get()!!) { toggleSlowAnimations() }
    }

    @DoNotStrip
    fun attachPseudoSelector(
        tag: Int,
        selector: Int,
        callback: PseudoSelectorCallback,
    ) = pseudoSelectorManager.attach(tag, selector, callback)

    @DoNotStrip
    fun detachPseudoSelector(
        tag: Int,
        selector: Int,
    ) = pseudoSelectorManager.detach(tag, selector)

    @DoNotStrip
    fun requestRender(callback: AnimationFrameCallback) {
        UiThreadUtil.assertOnUiThread()
        mNodesManager!!.postOnAnimation(callback)
    }

    @DoNotStrip fun getReanimatedJavaVersion(): String = BuildConfig.REANIMATED_VERSION_JAVA

    protected fun checkCppVersion() {
        if (cppVersion == null) {
            throw RuntimeException(
                "[Reanimated] Java side failed to resolve C++ code version. " +
                    "See https://docs.swmansion.com/react-native-reanimated/docs" +
                    "/guides/troubleshooting#java-side-failed-to-resolve-c-code-version for more information.",
            )
        }
        val javaVersion = getReanimatedJavaVersion()
        if (cppVersion != javaVersion) {
            throw RuntimeException(
                "[Reanimated] Mismatch between Java code version and C++ code version (" +
                    javaVersion +
                    " vs. " +
                    cppVersion +
                    " respectively). See " +
                    "https://docs.swmansion.com/react-native-reanimated/docs" +
                    "/guides/troubleshooting#mismatch-between-java-code-version-and-c-code-version for more information.",
            )
        }
    }

    @DoNotStrip
    fun preserveMountedTags(tags: IntArray): Boolean {
        if (!UiThreadUtil.isOnUiThread()) {
            return false
        }

        for (i in tags.indices) {
            try {
                if (mFabricUIManager.resolveView(tags[i]) == null) {
                    tags[i] = -1
                }
            } catch (e: IllegalViewOperationException) {
                // `resolveView` is expected to return `null` for a tag without a
                // mounted view, but it instead throws when the tag's `ViewState` is
                // already registered while the Android view hasn't been created yet.
                // This happens when a view is mid-preallocation and a third-party view
                // manager (e.g. lottie-react-native) dispatches an event synchronously
                // from within `createView`, re-entering this code path. Treat it the
                // same as a missing view.
                // See https://github.com/software-mansion/react-native-reanimated/issues/9636.
                tags[i] = -1
            }
        }

        return true
    }

    // TODO(#9681): Temporary workaround for RN >= 0.86. Since RN 0.86,
    // overrideBySynchronousMountPropsAtMountingAndroid defaults on, so RN's only public
    // synchronous-update API (synchronouslyUpdateViewOnUIThread) seeds the tagToSynchronousMountProps
    // cache that then clamps later commits and freezes animations. On RN >= 0.86 we instead call
    // MountingManager.updatePropsSynchronously directly (apply without cache seeding) via reflection, since
    // MountingManager is internal. On older RN the flag is off, so we keep the original RN path
    // unchanged (gated by BuildConfig.IS_REACT_NATIVE_86_OR_NEWER, derived from the RN version at
    // build time). Remove once RN exposes a non-seeding synchronous-update API.
    private val mountingManager: Any by lazy {
        FabricUIManager::class.java.getDeclaredField("mMountingManager").run {
            isAccessible = true
            get(mFabricUIManager)
        }
    }

    private val updatePropsSynchronouslyMethod by lazy {
        mountingManager.javaClass.methods
            .first {
                it.name.startsWith("updatePropsSynchronously") && it.parameterTypes.size == 2
            }.apply { isAccessible = true }
    }

    @DoNotStrip
    fun synchronouslyUpdateUIProps(
        intBuffer: IntArray,
        doubleBuffer: DoubleArray,
    ) {
        SynchronousPropsBufferParser.parse(intBuffer, doubleBuffer) { viewTag, props ->
            if (BuildConfig.IS_REACT_NATIVE_86_OR_NEWER) {
                try {
                    updatePropsSynchronouslyMethod.invoke(mountingManager, viewTag, props)
                } catch (e: Exception) {
                    Log.w("Reanimated", "synchronouslyUpdateUIProps failed for tag $viewTag", e)
                }
            } else {
                mFabricUIManager.synchronouslyUpdateViewOnUIThread(viewTag, props)
            }
        }
    }

    @DoNotStrip
    fun setGestureState(
        handlerTag: Int,
        newState: Int,
    ) {
        gestureHandlerStateManager?.setGestureHandlerState(handlerTag, newState)
    }

    @DoNotStrip
    fun getAnimationTimestamp(): Long =
        if (slowAnimationsEnabled) {
            firstUptime + (SystemClock.uptimeMillis() - firstUptime) / animationsDragFactor
        } else {
            SystemClock.uptimeMillis()
        }

    @DoNotStrip
    fun registerEventHandler(handler: EventHandler) {
        handler.mCustomEventNamesResolver = mNodesManager!!.getEventNameResolver()
        handler.isInDrawPassProvider = { mNodesManager!!.isInDrawPass() }
        mNodesManager!!.registerEventHandler(handler)
    }

    @DoNotStrip
    fun registerSensor(
        sensorType: Int,
        interval: Int,
        setter: SensorSetter,
    ): Int =
        reanimatedSensorContainer.registerSensor(
            ReanimatedSensorType.getInstanceById(sensorType),
            interval,
            setter,
        )

    @DoNotStrip
    fun unregisterSensor(sensorId: Int) {
        reanimatedSensorContainer.unregisterSensor(sensorId)
    }

    @DoNotStrip
    fun subscribeForKeyboardEvents(
        keyboardWorkletWrapper: KeyboardWorkletWrapper,
        isStatusBarTranslucent: Boolean,
        isNavigationBarTranslucent: Boolean,
    ): Int =
        keyboardAnimationManager.subscribeForKeyboardUpdates(
            keyboardWorkletWrapper,
            isStatusBarTranslucent,
            isNavigationBarTranslucent,
        )

    @DoNotStrip
    fun unsubscribeFromKeyboardEvents(listenerId: Int) {
        keyboardAnimationManager.unsubscribeFromKeyboardUpdates(listenerId)
    }

    @DoNotStrip
    fun getIsReducedMotion(): Boolean {
        val mContentResolver: ContentResolver = mContext.get()!!.contentResolver
        val rawValue =
            Settings.Global.getString(
                mContentResolver,
                Settings.Global.TRANSITION_ANIMATION_SCALE,
            )
        val parsedValue = if (rawValue != null) rawValue.toFloat() else 1f
        return parsedValue == 0f
    }

    @DoNotStrip
    fun maybeFlushUIUpdatesQueue() {
        UiThreadUtil.assertOnUiThread()
        if (!mNodesManager!!.isAnimationRunning()) {
            mNodesManager!!.performOperationsRespectingDrawPass()
        }
    }
}
