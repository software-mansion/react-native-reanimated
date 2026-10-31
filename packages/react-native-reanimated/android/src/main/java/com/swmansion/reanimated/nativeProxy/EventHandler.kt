package com.swmansion.reanimated.nativeProxy

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.swmansion.reanimated.forEachPayload

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
        event.forEachPayload { targetTag, payload -> handle(resolvedEventName, targetTag, payload) }
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
