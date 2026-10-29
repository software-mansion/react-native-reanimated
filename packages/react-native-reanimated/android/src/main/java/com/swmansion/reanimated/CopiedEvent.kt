package com.swmansion.reanimated

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTModernEventEmitter

class CopiedEvent(
    event: Event<*>,
    val resolvedEventName: String,
) {
    var targetTag: Int = 0
        private set

    var payload: WritableMap? = null
        private set

    init {
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
                    this@CopiedEvent.targetTag = targetTag
                    this@CopiedEvent.payload = params!!.copy()
                }
            },
        )
    }
}
