package com.example.counterview

import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class CounterView(
    private val reactContext: ThemedReactContext,
) : View(reactContext) {
    private var count = 0
    private var counterThread: ScheduledExecutorService? = null

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        counterThread =
            Executors.newSingleThreadScheduledExecutor().apply {
                scheduleAtFixedRate(::emitCount, 0, 16, TimeUnit.MILLISECONDS)
            }
    }

    override fun onDetachedFromWindow() {
        counterThread?.shutdownNow()
        counterThread = null
        super.onDetachedFromWindow()
    }

    private fun emitCount() {
        count += 1
        UIManagerHelper
            .getEventDispatcherForReactTag(reactContext, id)
            ?.dispatchEvent(CountEvent(UIManagerHelper.getSurfaceId(reactContext), id, count))
    }

    private class CountEvent(
        surfaceId: Int,
        viewId: Int,
        private val count: Int,
    ) : Event<CountEvent>(surfaceId, viewId) {
        override fun getEventName() = "onCount"

        override fun getEventData() = Arguments.createMap().apply { putInt("count", count) }
    }
}
