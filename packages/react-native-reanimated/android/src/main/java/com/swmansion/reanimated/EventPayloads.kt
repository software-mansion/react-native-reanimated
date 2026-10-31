package com.swmansion.reanimated

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTModernEventEmitter

internal inline fun Event<*>.forEachPayload(crossinline receive: (targetTag: Int, payload: WritableMap?) -> Unit) {
    dispatchModern(
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
                receive(targetTag, params)
            }
        },
    )
}
