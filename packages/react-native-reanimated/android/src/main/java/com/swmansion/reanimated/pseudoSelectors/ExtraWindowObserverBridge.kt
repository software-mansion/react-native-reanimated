package com.swmansion.reanimated.pseudoSelectors

import android.util.Log
import android.view.Window
import com.facebook.react.bridge.ReactContext
import java.lang.reflect.Proxy

internal class ExtraWindowObserverBridge(
    private val reactContext: ReactContext,
    private val hover: TouchHoverCoordinator,
) {
    private var listener: Any? = null

    fun install() {
        if (listener != null) {
            return
        }
        try {
            val listenerClass = Class.forName(LISTENER_CLASS)
            val proxy =
                Proxy.newProxyInstance(listenerClass.classLoader, arrayOf(listenerClass)) { self, method, args ->
                    when (method.name) {
                        "onExtraWindowCreate" -> hover.observeExtraWindow(args!![0] as Window)
                        "onExtraWindowDestroy" -> hover.stopObservingExtraWindow(args!![0] as Window)
                        "equals" -> return@newProxyInstance self === args!![0]
                        "hashCode" -> return@newProxyInstance System.identityHashCode(self)
                        "toString" ->
                            return@newProxyInstance "ReanimatedExtraWindowListener@" +
                                Integer.toHexString(System.identityHashCode(self))
                    }
                    null
                }
            reactContext.javaClass
                .getMethod("addExtraWindowEventListener", listenerClass)
                .invoke(reactContext, proxy)
            listener = proxy
        } catch (e: Throwable) {
            Log.w(TAG, "ExtraWindowEventListener unavailable; modal :hover uses the per-view fallback", e)
        }
    }

    fun uninstall() {
        val proxy = listener ?: return
        listener = null
        try {
            val listenerClass = Class.forName(LISTENER_CLASS)
            reactContext.javaClass
                .getMethod("removeExtraWindowEventListener", listenerClass)
                .invoke(reactContext, proxy)
        } catch (e: Throwable) {
            Log.w(TAG, "Failed to remove ExtraWindowEventListener", e)
        }
    }

    private companion object {
        const val LISTENER_CLASS = "com.facebook.react.interfaces.ExtraWindowEventListener"
        const val TAG = "Reanimated"
    }
}
