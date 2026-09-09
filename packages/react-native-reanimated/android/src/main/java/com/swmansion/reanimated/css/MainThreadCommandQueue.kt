package com.swmansion.reanimated.css

import android.os.Handler
import android.os.Looper
import android.os.Message

/**
 * Coalesces commands from any thread into one main-looper message per burst: a commit can
 * produce a command per view on screen, and a message each floods the looper. The message is
 * asynchronous so a traversal's sync barrier cannot defer it past the frame whose committed
 * values the commands are meant to replace. [execute] runs on the main thread, from the posted
 * message or from an explicit [drain].
 */
internal class MainThreadCommandQueue<T : Any>(
    private val execute: (T) -> Unit,
) {
    private val lock = Any()
    private var pending = ArrayList<T>()

    /** Null while a drain holds it, so the two buffers can never be the same list. */
    private var spare: ArrayList<T>? = ArrayList()
    private var scheduled = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val drainRunnable = Runnable { drain() }

    fun enqueue(command: T) {
        synchronized(lock) {
            pending.add(command)
            if (scheduled) return
            scheduled = true
            // Posted under the lock: a drain between deciding and posting would reset
            // `scheduled`, and the next enqueue would post a second message for this burst.
            val message = Message.obtain(mainHandler, drainRunnable)
            message.isAsynchronous = true
            mainHandler.sendMessage(message)
        }
    }

    /** Runs every queued command now; a later message for the same burst finds nothing left. */
    fun drain() {
        val batch: ArrayList<T>
        synchronized(lock) {
            batch = pending
            pending = spare ?: ArrayList()
            spare = null
            scheduled = false
        }
        try {
            for (command in batch) execute(command)
        } finally {
            batch.clear()
            synchronized(lock) { spare = batch }
        }
    }

    fun hasPending(): Boolean = synchronized(lock) { pending.isNotEmpty() }
}
