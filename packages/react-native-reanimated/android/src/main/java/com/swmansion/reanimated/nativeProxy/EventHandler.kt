package com.swmansion.reanimated.nativeProxy

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.events.RCTEventEmitter

@DoNotStrip
class EventHandler : RCTEventEmitter {

    @field:DoNotStrip
    private val mHybridData: HybridData

    var mCustomEventNamesResolver: UIManagerModule.CustomEventNamesResolver? = null

    @DoNotStrip
    private constructor(hybridData: HybridData) {
        mHybridData = hybridData
    }

    override fun receiveEvent(emitterReactTag: Int, eventName: String, event: WritableMap?) {
        val resolvedEventName = mCustomEventNamesResolver!!.resolveCustomEventName(eventName)!!
        receiveEvent(resolvedEventName, emitterReactTag, event)
    }

    external fun receiveEvent(eventName: String, emitterReactTag: Int, event: WritableMap?)

    override fun receiveTouches(
        eventName: String,
        touches: WritableArray,
        changedIndices: WritableArray
    ) {
        // not interested in processing touch events this way, we process raw events only
    }
}
