package com.swmansion.reanimated.pseudoSelectors

import android.util.Log
import android.view.Window
import com.facebook.react.bridge.ReactContext
import java.lang.reflect.Proxy

/**
 * Feeds each Modal/Dialog window into [TouchHoverCoordinator] so its blank-space touches clear :hover
 * like the Activity window - closing the Android modal gap and matching iOS.
 *
 * It bridges RN 0.86+'s public `com.facebook.react.interfaces.ExtraWindowEventListener`, which
 * `ReactModalHostView` fires with each modal Dialog's [Window] on show/dismiss. The listener is
 * referenced via reflection + a [Proxy] rather than a compile-time `object : ExtraWindowEventListener`,
 * because the interface is absent before RN 0.86 and reanimated compiles one source tree against RN
 * 0.83-0.86; the caller gates install on `BuildConfig.IS_REACT_NATIVE_86_OR_NEWER`. The proxy handles
 * equals/hashCode/toString so adding it to ReactContext's (already non-empty, e.g. StatusBarModule)
 * listener set cannot NPE on the identity scan.
 */
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
            // Absent/changed API -> stay on the per-view Modal fallback rather than crash.
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
