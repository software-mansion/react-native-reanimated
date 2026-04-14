package com.swmansion.worklets

import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class WorkletsMessageQueueThread : WorkletsMessageQueueThreadBase() {
    override fun runOnQueue(runnable: Runnable): Boolean = messageQueueThread.runOnQueue(runnable)

    override fun isIdle(): Boolean = messageQueueThread.isIdle()
}
