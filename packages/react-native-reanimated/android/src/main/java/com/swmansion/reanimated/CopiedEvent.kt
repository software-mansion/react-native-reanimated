package com.swmansion.reanimated

import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTModernEventEmitter

class CopiedEvent(event: Event<*>) {
    var surfaceId: Int = 0
        private set

    var targetTag: Int = 0
        private set

    var eventName: String = ""
        private set

    var canCoalesceEvent: Boolean = false
        private set

    var customCoalesceKey: Int = 0
        private set

    var payload: WritableMap? = null
        private set

    var category: Int = 0
        private set

    init {
        event.dispatchModern(
            object : RCTModernEventEmitter {
                override fun receiveTouches(
                    eventName: String,
                    touches: WritableArray,
                    changedIndices: WritableArray,
                ) {
                    // noop
                }

                override fun receiveEvent(
                    targetTag: Int,
                    eventName: String,
                    params: WritableMap?,
                ) {
                    this@CopiedEvent.targetTag = targetTag
                    this@CopiedEvent.eventName = eventName
                    assert(params != null)
                    this@CopiedEvent.payload = params!!.copy()
                }

                override fun receiveEvent(
                    surfaceId: Int,
                    targetTag: Int,
                    eventName: String,
                    params: WritableMap?,
                ) {
                    this@CopiedEvent.surfaceId = surfaceId
                    this@CopiedEvent.targetTag = targetTag
                    this@CopiedEvent.eventName = eventName
                    assert(params != null)
                    this@CopiedEvent.payload = params!!.copy()
                }

                override fun receiveEvent(
                    surfaceId: Int,
                    targetTag: Int,
                    eventName: String,
                    canCoalesceEvent: Boolean,
                    customCoalesceKey: Int,
                    params: WritableMap?,
                    category: Int,
                ) {
                    this@CopiedEvent.surfaceId = surfaceId
                    this@CopiedEvent.targetTag = targetTag
                    this@CopiedEvent.eventName = eventName
                    this@CopiedEvent.canCoalesceEvent = canCoalesceEvent
                    this@CopiedEvent.customCoalesceKey = customCoalesceKey
                    assert(params != null)
                    this@CopiedEvent.payload = params!!.copy()
                    this@CopiedEvent.category = category
                }
            },
        )
    }
}
