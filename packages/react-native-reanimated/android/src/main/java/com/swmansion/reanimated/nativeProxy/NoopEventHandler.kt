package com.swmansion.reanimated.nativeProxy

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTModernEventEmitter

class NoopEventHandler : RCTModernEventEmitter {
    override fun receiveEvent(
        surfaceId: Int,
        targetTag: Int,
        eventName: String,
        canCoalesceEvent: Boolean,
        customCoalesceKey: Int,
        params: WritableMap?,
        category: Int,
    ) {
        // NOOP
    }
}
