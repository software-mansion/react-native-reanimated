package com.swmansion.reanimated

import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTEventEmitter

class CopiedEvent(event: Event<*>) {
  var targetTag: Int = 0
    private set

  var eventName: String = ""
    private set

  var payload: WritableMap? = null
    private set

  init {
    event.dispatch(
        object : RCTEventEmitter {
          override fun receiveEvent(targetTag: Int, eventName: String, event: WritableMap?) {
            this@CopiedEvent.targetTag = targetTag
            this@CopiedEvent.eventName = eventName
            this@CopiedEvent.payload = event?.copy()
          }

          override fun receiveTouches(
              eventName: String,
              touches: WritableArray,
              changedIndices: WritableArray
          ) {
            // noop
          }
        })
  }
}
