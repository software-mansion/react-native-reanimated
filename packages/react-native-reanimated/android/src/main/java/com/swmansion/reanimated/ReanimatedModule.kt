package com.swmansion.reanimated

import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeReanimatedModuleSpec.NAME)
class ReanimatedModule(
    reactContext: ReactApplicationContext,
) : NativeReanimatedModuleSpec(reactContext),
    LifecycleEventListener {
    private var mNodesManager: NodesManager? = null
    private var mTurboModuleInstalled = false

    init {
        reactContext.assertOnJSQueueThread()
    }

    override fun initialize() {
        val reactContext = reactApplicationContext
        reactContext.assertOnJSQueueThread()
        reactContext.addLifecycleEventListener(this)
    }

    override fun onHostPause() {
        mNodesManager?.onHostPause()
    }

    override fun onHostResume() {
        mNodesManager?.onHostResume()
    }

    override fun onHostDestroy() {
        // do nothing
    }

    // This property is accessed from react-native-gesture-handler.
    val nodesManager: NodesManager?
        get() = mNodesManager

    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun installTurboModule(): Boolean {
        val reactContext = reactApplicationContext
        reactContext.assertOnJSQueueThread()
        mNodesManager = NodesManager(reactContext)
        mNodesManager!!.getNativeProxy()!!.installJSIBindings()
        return true
    }

    @ReactMethod
    fun addListener(ignoredEventName: String) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(ignoredCount: Int) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    override fun invalidate() {
        super.invalidate()
        mNodesManager?.invalidate()
        val reactContext = reactApplicationContext
        reactContext.removeLifecycleEventListener(this)
    }
}
