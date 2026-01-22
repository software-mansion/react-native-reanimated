package com.swmansion.worklets.networking

import com.facebook.jni.HybridData
import com.facebook.jni.annotations.DoNotStrip
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableNativeArray

@Suppress("KotlinJniMissingFunction")
class WorkletRuntimeWrapper @DoNotStrip private constructor(
    @field:DoNotStrip private val mHybridData: HybridData
) {
    fun emitDeviceEvent(eventName: String, params: Any?) {
        cxxEmitDeviceEvent(Arguments.fromJavaArgs(arrayOf(eventName, params)));
    }

    fun getRuntimeId(): Int {
        return cxxGetRuntimeId();
    }

    private external fun cxxEmitDeviceEvent(args: WritableNativeArray);

    private external fun cxxGetRuntimeId(): Int;
}
