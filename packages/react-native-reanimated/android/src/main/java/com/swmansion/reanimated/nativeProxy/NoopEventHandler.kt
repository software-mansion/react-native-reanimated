package com.swmansion.reanimated.nativeProxy

import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter

class NoopEventHandler : RCTEventEmitter {
  override fun receiveEvent(targetTag: Int, eventName: String, event: WritableMap?) {
    // NOOP
  }

  override fun receiveTouches(
      eventName: String,
      touches: WritableArray,
      changedIndices: WritableArray
  ) {
    // NOOP
  }
}
