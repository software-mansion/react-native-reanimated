package com.swmansion.worklets

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.GuardedRunnable
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import java.util.concurrent.atomic.AtomicBoolean

@Suppress("KotlinJniMissingFunction")
class AndroidUIScheduler(context: ReactApplicationContext) {

    @field:DoNotStrip
    private val mHybridData: HybridData = initHybrid()

    private val mContext: ReactApplicationContext = context
    private val mActive = AtomicBoolean(true)

    private val mUIThreadRunnable = Runnable {
        // This callback is called on the UI thread, but the module is invalidated on the JS
        // thread. Therefore, we must synchronize for reloads. Without synchronization the cpp part
        // gets torn down while the UI thread is still executing it, leading to crashes.
        synchronized(mActive) {
            if (mActive.get()) {
                triggerUI()
            }
        }
    }

    private external fun initHybrid(): HybridData

    external fun triggerUI()

    external fun invalidate()

    @DoNotStrip
    @Suppress("unused")
    private fun scheduleTriggerOnUI() {
        UiThreadUtil.runOnUiThread(
            object : GuardedRunnable(mContext.exceptionHandler) {
                override fun runGuarded() {
                    mUIThreadRunnable.run()
                }
            }
        )
    }

    fun deactivate() {
        synchronized(mActive) {
            mActive.set(false)
            invalidate()
        }
    }
}
