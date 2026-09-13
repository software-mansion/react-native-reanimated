package com.swmansion.worklets.inspector

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

/**
 * A WebSocket to the Metro inspector proxy owned by the Worklets inspector connection. OkHttp
 * delivers every callback on its own threads, never on the main thread, and the native side moves
 * them to the inspector thread.
 */
@DoNotStrip
@Suppress("KotlinJniMissingFunction")
class WorkletsInspectorWebSocket
    @DoNotStrip
    private constructor(
        @field:DoNotStrip private val mHybridData: HybridData,
    ) : WebSocketListener() {
        private var webSocket: WebSocket? = null

        @DoNotStrip
        fun connect(url: String) {
            webSocket = client.newWebSocket(Request.Builder().url(url).build(), this)
        }

        @DoNotStrip
        fun send(message: String) {
            webSocket?.send(message)
        }

        @DoNotStrip
        fun close() {
            webSocket?.close(NORMAL_CLOSURE_CODE, "End of session")
            webSocket = null
        }

        override fun onOpen(
            webSocket: WebSocket,
            response: Response,
        ) {
            didOpen()
        }

        override fun onMessage(
            webSocket: WebSocket,
            text: String,
        ) {
            didReceiveMessage(text)
        }

        override fun onClosed(
            webSocket: WebSocket,
            code: Int,
            reason: String,
        ) {
            didClose()
        }

        override fun onFailure(
            webSocket: WebSocket,
            t: Throwable,
            response: Response?,
        ) {
            didFailWithError(t.message ?: "<Unknown error>")
        }

        private external fun didOpen()

        private external fun didReceiveMessage(message: String)

        private external fun didClose()

        private external fun didFailWithError(error: String)

        companion object {
            private const val NORMAL_CLOSURE_CODE = 1000

            private val client: OkHttpClient by lazy {
                OkHttpClient
                    .Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .writeTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(0, TimeUnit.MINUTES)
                    .build()
            }
        }
    }
