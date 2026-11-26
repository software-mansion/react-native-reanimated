package com.example.polledcounter

import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class PolledCounterModule(
    reactContext: ReactApplicationContext,
) : NativePolledCounterSpec(reactContext) {
    private val count = AtomicInteger()
    private val counterThread =
        Executors.newSingleThreadScheduledExecutor().apply {
            scheduleAtFixedRate(count::incrementAndGet, 0, 16, TimeUnit.MILLISECONDS)
        }

    override fun getCount() = count.get().toDouble()

    override fun invalidate() {
        counterThread.shutdownNow()
        super.invalidate()
    }
}
