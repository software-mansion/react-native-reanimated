package com.swmansion.reanimated.nativeProxy

import com.facebook.react.bridge.WritableArray
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
        // noop
    }

    override fun receiveEvent(
        surfaceId: Int,
        targetTag: Int,
        eventName: String,
        params: WritableMap?,
    ) {
        // noop
    }

    override fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?) {
        // noop
    }

    override fun receiveTouches(
        eventName: String,
        touches: WritableArray,
        changedIndices: WritableArray,
    ) {
        // noop
    }
}
