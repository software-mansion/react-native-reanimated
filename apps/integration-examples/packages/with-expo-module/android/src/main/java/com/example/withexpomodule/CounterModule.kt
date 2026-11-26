package com.example.withexpomodule

import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import expo.modules.kotlin.jni.worklets.Worklet
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class CounterModule : Module() {
    private val count = AtomicInteger()
    private val lastListenerId = AtomicInteger()
    private val listeners = ConcurrentHashMap<Int, Worklet>()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var counterThread: ScheduledExecutorService? = null
    private val frameListeners = ConcurrentHashMap<Int, Worklet>()
    private var isPostingFrames = false
    private val frameCallback = Choreographer.FrameCallback { runFrameWorklets() }

    override fun definition() =
        ModuleDefinition {
            Name("WithExpoModuleCounter")

            Function("getCount") {
                count.get()
            }

            Function("addWorkletListener") { worklet: Worklet ->
                lastListenerId.incrementAndGet().also { listeners[it] = worklet }
            }

            Function("removeWorkletListener") { id: Int ->
                listeners -= id
            }

            Function("addFrameWorkletListener") { worklet: Worklet ->
                lastListenerId.incrementAndGet().also {
                    frameListeners[it] = worklet
                    mainHandler.post(::updateFrameCallback)
                }
            }

            Function("removeFrameWorkletListener") { id: Int ->
                frameListeners -= id
                mainHandler.post(::updateFrameCallback)
            }

            OnCreate {
                counterThread =
                    Executors.newSingleThreadScheduledExecutor().apply {
                        scheduleAtFixedRate(::tick, 0, 16, TimeUnit.MILLISECONDS)
                    }
            }

            OnDestroy {
                counterThread?.shutdownNow()
                listeners.clear()
                frameListeners.clear()
                mainHandler.post(::updateFrameCallback)
            }
        }

    private fun tick() {
        val newCount = count.incrementAndGet()
        mainHandler.post { runWorklets(newCount) }
    }

    private fun runWorklets(newCount: Int) {
        if (listeners.isEmpty()) {
            return
        }
        val runtime = appContext.uiRuntime
        listeners.values.forEach { it.execute(runtime, newCount) }
    }

    private fun updateFrameCallback() {
        val shouldPostFrames = frameListeners.isNotEmpty()
        if (shouldPostFrames == isPostingFrames) {
            return
        }
        isPostingFrames = shouldPostFrames
        if (shouldPostFrames) {
            Choreographer.getInstance().postFrameCallback(frameCallback)
        } else {
            Choreographer.getInstance().removeFrameCallback(frameCallback)
        }
    }

    private fun runFrameWorklets() {
        if (frameListeners.isEmpty()) {
            isPostingFrames = false
            return
        }
        val runtime = appContext.uiRuntime
        val currentCount = count.get()
        frameListeners.values.forEach { it.execute(runtime, currentCount) }
        Choreographer.getInstance().postFrameCallback(frameCallback)
    }
}
