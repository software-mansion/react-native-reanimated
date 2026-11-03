package com.swmansion.reanimated

import android.content.ContentResolver
import android.graphics.Color
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl
import com.facebook.react.uimanager.BackgroundStyleApplicator
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.soloader.SoLoader
import com.swmansion.common.GestureHandlerStateManager
import com.swmansion.reanimated.keyboard.KeyboardAnimationManager
import com.swmansion.reanimated.keyboard.KeyboardWorkletWrapper
import com.swmansion.reanimated.nativeAnimations.NativeAnimationExecutor
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
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.write

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
    private val nativeAnimationExecutor: NativeAnimationExecutor
    private val rewritesSynchronousProps: Boolean
    private val routesLayoutNatively: Boolean
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

    // Guards the C++ state that invalidateCpp() destroys against calls from the UI thread.
    private val mNativeStateLock = ReentrantReadWriteLock()

    @field:DoNotStrip
    @Suppress("unused")
    private val mHybridData: HybridData

    @OptIn(UnstableReactNativeAPI::class)
    private val mountListener =
        object : UIManagerListener {
            override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

            override fun willMountItems(uiManager: UIManager) {
                if (routesLayoutNatively) {
                    UiThreadUtil.assertOnUiThread()
                    ifNotInvalidated(Unit) { nativeAnimationsWillMountItems() }
                }
            }

            override fun didMountItems(uiManager: UIManager) {
                nativeAnimationExecutor.markFabricWrite()
                if (routesLayoutNatively) {
                    UiThreadUtil.assertOnUiThread()
                    ifNotInvalidated(Unit) { nativeAnimationsDidMountItems() }
                } else if (rewritesSynchronousProps) {
                    ifNotInvalidated(Unit) { rewriteSynchronousProps() }
                }
            }

            override fun didDispatchMountItems(uiManager: UIManager) = Unit

            override fun didScheduleMountItems(uiManager: UIManager) = Unit
        }

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
        pseudoSelectorManager = PseudoSelectorManager(mFabricUIManager, mContext)
        nativeAnimationExecutor =
            NativeAnimationExecutor(mFabricUIManager, mContext, ::animationTimestampOf) { call ->
                ifNotInvalidated(Unit, call)
            }

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
        rewritesSynchronousProps = hasSynchronousWritesTracker()
        routesLayoutNatively = hasNativeLayoutRouteFlag()
        if (rewritesSynchronousProps || hasNativeAnimationPlatform()) {
            @OptIn(UnstableReactNativeAPI::class)
            mFabricUIManager.addUIManagerEventListener(mountListener)
        }
    }

    private external fun initHybrid(
        jsContext: Long,
        jsCallInvokerHolder: CallInvokerHolderImpl,
        fabricUIManager: FabricUIManager,
    ): HybridData

    private external fun isAnyHandlerWaitingForEventCpp(
        eventName: String,
        emitterReactTag: Int,
    ): Boolean

    private external fun performOperationsCpp()

    private external fun performNonLayoutOperationsCpp()

    private external fun hasSynchronousWritesTracker(): Boolean

    private external fun rewriteSynchronousProps()

    private external fun hasNativeAnimationPlatform(): Boolean

    private external fun hasNativeLayoutRouteFlag(): Boolean

    private external fun nativeAnimationsWillMountItems()

    /** Runs the layout mount report of the dispatch, then the synchronous props rewrite. */
    private external fun nativeAnimationsDidMountItems()

    private external fun failNextNativeAnimationViewLookupCpp(tag: Int)

    private external fun takeNativeAnimationViewLookupFailureCpp(): LongArray?

    external fun installJSIBindings()

    private external fun invalidateCpp()

    private external fun toggleSlowAnimationsOnUIRuntime()

    protected fun getHybridData(): HybridData = mHybridData

    // tryLock, because the UI thread may hold the UI runtime lock, which could deadlock with invalidate()
    private inline fun <T> ifNotInvalidated(
        fallback: T,
        block: () -> T,
    ): T {
        val readLock = mNativeStateLock.readLock()
        if (!readLock.tryLock()) {
            return fallback
        }
        try {
            if (mInvalidated.get()) {
                return fallback
            }
            return block()
        } finally {
            readLock.unlock()
        }
    }

    fun isAnyHandlerWaitingForEvent(
        eventName: String,
        emitterReactTag: Int,
    ): Boolean = ifNotInvalidated(false) { isAnyHandlerWaitingForEventCpp(eventName, emitterReactTag) }

    fun performOperations() = ifNotInvalidated(Unit) { performOperationsCpp() }

    fun performNonLayoutOperations() = ifNotInvalidated(Unit) { performNonLayoutOperationsCpp() }

    fun invalidate() {
        if (mInvalidated.getAndSet(true)) {
            return
        }
        @OptIn(UnstableReactNativeAPI::class)
        mFabricUIManager.removeUIManagerEventListener(mountListener)
        pseudoSelectorManager.invalidate()
        nativeAnimationExecutor.invalidate()
        mNativeStateLock.write {
            if (mHybridData.isValid) {
                invalidateCpp()
            }
        }
    }

    private fun toggleSlowAnimations() {
        slowAnimationsEnabled = !slowAnimationsEnabled
        if (slowAnimationsEnabled) {
            firstUptime = SystemClock.uptimeMillis()
        }
        mNodesManager!!.enableSlowAnimations(slowAnimationsEnabled, animationsDragFactor)
        nativeAnimationExecutor.enableSlowAnimations(slowAnimationsEnabled, animationsDragFactor)
        ifNotInvalidated(Unit) { toggleSlowAnimationsOnUIRuntime() }
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
        val guardedCallback =
            object : NodesManager.OnAnimationFrame {
                override fun onAnimationFrame(timestampMs: Double) = ifNotInvalidated(Unit) { callback.onAnimationFrame(timestampMs) }
            }
        UiThreadUtil.assertOnUiThread()
        mNodesManager!!.postOnAnimation(guardedCallback)
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
    fun obtainMountedViewProps(tag: Int): DoubleArray? {
        if (!UiThreadUtil.isOnUiThread()) {
            return null
        }
        val view =
            try {
                mFabricUIManager.resolveView(tag)
            } catch (e: IllegalViewOperationException) {
                null
            } ?: return null
        if (!view.isAttachedToWindow) {
            return null
        }
        return doubleArrayOf(
            PixelUtil.toDIPFromPixel(view.left.toFloat()).toDouble(),
            PixelUtil.toDIPFromPixel(view.top.toFloat()).toDouble(),
            PixelUtil.toDIPFromPixel(view.width.toFloat()).toDouble(),
            PixelUtil.toDIPFromPixel(view.height.toFloat()).toDouble(),
            view.alpha.toDouble(),
            (BackgroundStyleApplicator.getBackgroundColor(view) ?: Color.TRANSPARENT).toDouble(),
        )
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

    // TODO(#9681): Temporary workaround. Since RN 0.86,
    // overrideBySynchronousMountPropsAtMountingAndroid defaults on, so RN's only public
    // synchronous-update API (synchronouslyUpdateViewOnUIThread) seeds the tagToSynchronousMountProps
    // cache that then clamps later commits and freezes animations. We instead call
    // MountingManager.updatePropsSynchronously directly (apply without cache seeding) via reflection, since
    // MountingManager is internal. Remove once RN exposes a non-seeding synchronous-update API.
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

    private val getViewExistsMethod by lazy {
        runCatching { mountingManager.javaClass.getMethod("getViewExists", Int::class.javaPrimitiveType) }.getOrNull()
    }

    @DoNotStrip
    fun synchronouslyUpdateUIProps(
        intBuffer: IntArray,
        doubleBuffer: DoubleArray,
    ) {
        nativeAnimationExecutor.markFabricWrite()
        SynchronousPropsBufferParser.parse(intBuffer, doubleBuffer) { viewTag, props ->
            try {
                // The props stay in the registry, and the commit hook applies them to the shadow tree.
                if (getViewExistsMethod?.invoke(mountingManager, viewTag) == false) {
                    return@parse
                }
                updatePropsSynchronouslyMethod.invoke(mountingManager, viewTag, props)
                if (routesLayoutNatively && props.hasKey("opacity")) {
                    nativeAnimationExecutor.setOpacityModel(viewTag, props.getDouble("opacity"))
                }
            } catch (e: Exception) {
                Log.w("Reanimated", "synchronouslyUpdateUIProps failed for tag $viewTag: ${e.cause ?: e}")
            }
        }
    }

    @DoNotStrip
    @Suppress("unused")
    private fun getNativeAnimationExecutor(): NativeAnimationExecutor = nativeAnimationExecutor

    /**
     * Runtime tests only: the next view lookup of a native layout start of the tag finds no view. A build
     * without the runtime test hooks has no such entry and throws `UnsatisfiedLinkError`. UI thread only.
     */
    fun failNextNativeAnimationViewLookup(tag: Int) {
        UiThreadUtil.assertOnUiThread()
        ifNotInvalidated(Unit) { failNextNativeAnimationViewLookupCpp(tag) }
    }

    /**
     * Runtime tests only: the playbacks on the view at the failed lookup, `TRACK_KEY_LENGTH` values for each;
     * null when the lookup did not fail. UI thread only.
     */
    fun takeNativeAnimationViewLookupFailure(): LongArray? {
        UiThreadUtil.assertOnUiThread()
        return ifNotInvalidated(null) { takeNativeAnimationViewLookupFailureCpp() }
    }

    @DoNotStrip
    fun setGestureState(
        handlerTag: Int,
        newState: Int,
    ) {
        gestureHandlerStateManager?.setGestureHandlerState(handlerTag, newState)
    }

    @DoNotStrip
    fun getAnimationTimestamp(): Long = animationTimestampOf(SystemClock.uptimeMillis())

    /** Reanimated's clock at the time [uptimeMs] of `SystemClock.uptimeMillis()`. */
    private fun animationTimestampOf(uptimeMs: Long): Long =
        if (slowAnimationsEnabled) {
            firstUptime + (uptimeMs - firstUptime) / animationsDragFactor
        } else {
            uptimeMs
        }

    @DoNotStrip
    fun registerEventHandler(handler: EventHandler) {
        handler.isInDrawPassProvider = { mNodesManager!!.isInDrawPass() }
        handler.nativeCallGuard = { receive -> ifNotInvalidated(Unit, receive) }
        mNodesManager!!.registerEventHandler(handler)
    }

    @DoNotStrip
    fun isSensorAvailable(sensorType: Int): Boolean =
        reanimatedSensorContainer.isSensorAvailable(ReanimatedSensorType.getInstanceById(sensorType))

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
        val parsedValue =
            Settings.Global.getFloat(
                mContentResolver,
                Settings.Global.TRANSITION_ANIMATION_SCALE,
                1f,
            )
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
