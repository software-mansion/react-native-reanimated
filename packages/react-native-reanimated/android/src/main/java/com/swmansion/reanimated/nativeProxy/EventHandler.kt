package com.swmansion.reanimated.nativeProxy

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.events.RCTModernEventEmitter

@DoNotStrip
class EventHandler : RCTModernEventEmitter {

    @field:DoNotStrip
    private val mHybridData: HybridData

    var mCustomEventNamesResolver: UIManagerModule.CustomEventNamesResolver? = null

    @DoNotStrip
    private constructor(hybridData: HybridData) {
        mHybridData = hybridData
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
        val resolvedEventName = mCustomEventNamesResolver!!.resolveCustomEventName(eventName) ?: eventName
        receiveEvent(resolvedEventName, targetTag, params)
    }

    external fun receiveEvent(eventName: String, emitterReactTag: Int, event: WritableMap?)
}
