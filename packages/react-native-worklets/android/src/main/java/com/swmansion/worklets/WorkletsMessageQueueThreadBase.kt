package com.swmansion.worklets

import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.queue.MessageQueueThread
import com.facebook.react.bridge.queue.MessageQueueThreadImpl
import com.facebook.react.bridge.queue.MessageQueueThreadPerfStats
import com.facebook.react.bridge.queue.MessageQueueThreadSpec
import java.util.concurrent.Callable
import java.util.concurrent.Future

// This class is an almost exact copy of MessageQueueThreadImpl taken from here:
// https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/bridge/queue/MessageQueueThreadImpl.kt
// The only method that has changed is `quitSynchronous()` (see comment above
// function implementation for details).
@DoNotStrip
abstract class WorkletsMessageQueueThreadBase : MessageQueueThread {
    protected val messageQueueThread: MessageQueueThreadImpl =
        MessageQueueThreadImpl.create(
            MessageQueueThreadSpec.mainThreadSpec(),
        ) { exception ->
            throw RuntimeException(exception)
        }

    override fun <T> callOnQueue(callable: Callable<T>): Future<T> = messageQueueThread.callOnQueue(callable)

    override fun isOnThread(): Boolean = messageQueueThread.isOnThread()

    override fun assertIsOnThread() {
        messageQueueThread.assertIsOnThread()
    }

    override fun assertIsOnThread(s: String) {
        messageQueueThread.assertIsOnThread(s)
    }

    // We don't want to quit the main looper (which is what MessageQueueThreadImpl would have done),
    // but we still want to prevent anything else from executing.
    @Suppress("CallToPrintStackTrace")
    override fun quitSynchronous() {
        try {
            val mIsFinished = messageQueueThread.javaClass.getDeclaredField("mIsFinished")
            mIsFinished.isAccessible = true
            mIsFinished.set(messageQueueThread, true)
            mIsFinished.isAccessible = false
        } catch (e: NoSuchFieldException) {
            e.printStackTrace()
        } catch (e: IllegalAccessException) {
            e.printStackTrace()
        }
    }

    override fun getPerfStats(): MessageQueueThreadPerfStats? = messageQueueThread.getPerfStats()

    override fun resetPerfStats() {
        messageQueueThread.resetPerfStats()
    }
}
