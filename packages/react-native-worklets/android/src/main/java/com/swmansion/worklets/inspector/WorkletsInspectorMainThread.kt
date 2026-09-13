package com.swmansion.worklets.inspector

import android.os.Handler
import android.os.Looper
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
object WorkletsInspectorMainThread {
    private val handler = Handler(Looper.getMainLooper())

    @DoNotStrip
    @JvmStatic
    fun post(runnable: Runnable) {
        handler.post(runnable)
    }
}
