package com.swmansion.reanimated

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class CopiedEvent(
    event: Event<*>,
    val resolvedEventName: String,
) {
    var targetTag: Int = 0
        private set

    var payload: WritableMap? = null
        private set

    init {
        event.forEachPayload { targetTag, payload ->
            this.targetTag = targetTag
            this.payload = payload?.copy()
        }
    }
}
