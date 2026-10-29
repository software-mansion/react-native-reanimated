package com.swmansion.reanimated.nativeProxy

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTModernEventEmitter

@DoNotStrip
class EventHandler {
    @field:DoNotStrip
    private val mHybridData: HybridData

    internal var isInDrawPassProvider: (() -> Boolean)? = null
    internal var nativeCallGuard: (() -> Unit) -> Unit = { it() }

    @DoNotStrip
    private constructor(hybridData: HybridData) {
        mHybridData = hybridData
    }

    private fun isInDrawPass(): Boolean = isInDrawPassProvider?.invoke() == true

    internal fun handle(
        event: Event<*>,
        resolvedEventName: String,
    ) {
        event.dispatchModern(
            object : RCTModernEventEmitter {
                @Suppress("OVERRIDE_DEPRECATION")
                override fun receiveEvent(
                    surfaceId: Int,
                    targetTag: Int,
                    eventName: String,
                    canCoalesceEvent: Boolean,
                    customCoalesceKey: Int,
                    params: WritableMap?,
                    category: Int,
                ) {
                    handle(resolvedEventName, targetTag, params)
                }
            },
        )
    }

    internal fun handle(
        resolvedEventName: String,
        targetTag: Int,
        params: WritableMap?,
    ) {
        nativeCallGuard { receiveEvent(resolvedEventName, targetTag, params, isInDrawPass()) }
    }

    external fun receiveEvent(
        eventName: String,
        emitterReactTag: Int,
        event: WritableMap?,
        isInDrawPass: Boolean,
    )
}
