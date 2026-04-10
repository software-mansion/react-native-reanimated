package com.swmansion.reanimated

import com.facebook.react.bridge.JSApplicationCausedNativeException
import com.facebook.react.bridge.NoSuchKeyException
import com.facebook.react.bridge.ReadableMap

object MapUtils {
    @JvmStatic
    fun getInt(
        map: ReadableMap,
        name: String,
        errorMsg: String,
    ): Int {
        try {
            return map.getInt(name)
        } catch (e: NoSuchKeyException) {
            throw JSApplicationCausedNativeException(errorMsg)
        }
    }

    @JvmStatic
    fun getString(
        map: ReadableMap,
        name: String,
        errorMsg: String,
    ): String? {
        try {
            return map.getString(name)
        } catch (e: NoSuchKeyException) {
            throw JSApplicationCausedNativeException(errorMsg)
        }
    }
}
