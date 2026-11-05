package com.swmansion.worklets.networking

import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.modules.network.CookieJarContainer
import com.facebook.react.modules.network.ForwardingCookieHandler
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.Call
import okhttp3.Callback
import okhttp3.CookieJar
import okhttp3.JavaNetCookieJar
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import okhttp3.WebSocket
import okio.Buffer
import okio.BufferedSink
import okio.ByteString
import okio.ByteString.Companion.toByteString
import okio.ForwardingSink
import okio.buffer
import okio.utf8Size
import java.io.IOException
import java.io.InterruptedIOException
import java.nio.charset.Charset
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class Networking {
    companion object {
        const val ERROR_NETWORK = 0
        const val ERROR_TIMEOUT = 1
        const val ERROR_ABORTED = 2
        private const val PROGRESS_INTERVAL_MS = 50L
        private const val NORMAL_CLOSURE = 1000
        private const val NO_STATUS_RECEIVED = 1005
        private const val ABNORMAL_CLOSURE = 1006
        private const val MAX_CLOSE_REASON_BYTES = 123
        private const val MESSAGE_TOO_BIG = 1009
        private const val MAX_MESSAGE_BYTES = 16 * 1024 * 1024
        private const val READ_BUFFER_SIZE = 65536L
        private val METHODS_REQUIRING_BODY = setOf("POST", "PUT", "PATCH")
    }

    private val mClient: OkHttpClient by lazy {
        val client = OkHttpClientProvider.createClient()
        (client.cookieJar as? CookieJarContainer)?.setCookieJar(JavaNetCookieJar(ForwardingCookieHandler()))
        client
    }
    private val mCalls = ConcurrentHashMap<Long, Call>()
    private val mWebSockets = ConcurrentHashMap<Long, WebSocket>()
    private val mSettledSocketIds: MutableSet<Long> = Collections.newSetFromMap(ConcurrentHashMap())
    private val mNoStatusSocketIds: MutableSet<Long> = Collections.newSetFromMap(ConcurrentHashMap())
    private val mListeners = ConcurrentHashMap<Long, WebSocketListener>()
    private val mSettledIds: MutableSet<Long> = Collections.newSetFromMap(ConcurrentHashMap())
    private val mAbortedIds: MutableSet<Long> = Collections.newSetFromMap(ConcurrentHashMap())

    @DoNotStrip
    @Suppress("TooGenericExceptionCaught")
    fun sendRequest(
        requestIdAsDouble: Double,
        method: String,
        url: String,
        headerNames: Array<String>,
        headerValues: Array<String>,
        body: ByteArray?,
        timeoutMs: Double,
        withCredentials: Boolean,
        listener: NetworkRequestListener,
    ) {
        val requestId = requestIdAsDouble.toLong()
        try {
            val call = buildCall(method, url, headerNames, headerValues, body, timeoutMs, withCredentials, listener)
            mCalls[requestId] = call
            if (mAbortedIds.contains(requestId)) {
                call.cancel()
            }
            call.enqueue(
                object : Callback {
                    override fun onFailure(
                        call: Call,
                        e: IOException,
                    ) {
                        val code = errorCode(requestId, call, e)
                        cleanup(requestId)
                        listener.onError(code, e.message ?: e.javaClass.simpleName)
                    }

                    override fun onResponse(
                        call: Call,
                        response: Response,
                    ) {
                        try {
                            response.use { handleResponse(it, listener) }
                        } catch (t: Throwable) {
                            listener.onError(
                                if (t is IOException) errorCode(requestId, call, t) else ERROR_NETWORK,
                                t.message ?: t.javaClass.simpleName,
                            )
                        } finally {
                            cleanup(requestId)
                        }
                    }
                },
            )
        } catch (e: Exception) {
            cleanup(requestId)
            listener.onError(ERROR_NETWORK, e.message ?: e.javaClass.simpleName)
        }
    }

    @DoNotStrip
    @Suppress("LongParameterList", "TooGenericExceptionCaught")
    fun connectWebSocket(
        socketIdAsDouble: Double,
        url: String,
        protocols: Array<String>,
        headerNames: Array<String>,
        headerValues: Array<String>,
        listener: WebSocketListener,
    ) {
        val socketId = socketIdAsDouble.toLong()
        try {
            val requestBuilder = Request.Builder().url(url)
            for (i in headerNames.indices) {
                requestBuilder.addHeader(headerNames[i], headerValues[i])
            }
            if (protocols.isNotEmpty()) {
                requestBuilder.addHeader("Sec-WebSocket-Protocol", protocols.joinToString(", "))
            }
            mListeners[socketId] = listener
            val socket = mClient.newWebSocket(requestBuilder.build(), SocketListener(socketId, listener))

            /**
             * OkHttp can fail a socket before `newWebSocket` returns, and can also
             * settle it on a dispatcher thread while this one is still here. The
             * store is therefore conditional on the id not having settled, in one
             * atomic step, so a dead socket can never be left behind.
             */
            val stored =
                mWebSockets.compute(socketId) { _, _ ->
                    if (mSettledSocketIds.contains(socketId)) null else socket
                }
            if (stored == null) {
                mSettledIds.remove(socketId)
                mSettledSocketIds.remove(socketId)
                socket.cancel()
            }
        } catch (e: Exception) {
            mWebSockets.remove(socketId)
            mListeners.remove(socketId)
            mSettledIds.remove(socketId)
            mSettledSocketIds.remove(socketId)
            mNoStatusSocketIds.remove(socketId)
            listener.onError(e.message ?: e.javaClass.simpleName)
            listener.onClose(ABNORMAL_CLOSURE, "", false)
        }
    }

    @DoNotStrip
    fun sendWebSocketText(
        socketIdAsDouble: Double,
        message: ByteArray,
    ) {
        val socketId = socketIdAsDouble.toLong()
        val socket = mWebSockets[socketId] ?: return
        if (socket.send(String(message, Charsets.UTF_8))) {
            mListeners[socketId]?.onFlushed(message.size.toLong())
        }
    }

    @DoNotStrip
    fun sendWebSocketBinary(
        socketIdAsDouble: Double,
        message: ByteArray,
    ) {
        val socketId = socketIdAsDouble.toLong()
        val socket = mWebSockets[socketId] ?: return
        if (socket.send(message.toByteString())) {
            mListeners[socketId]?.onFlushed(message.size.toLong())
        }
    }

    @DoNotStrip
    fun closeWebSocket(
        socketIdAsDouble: Double,
        code: Int,
        reason: String,
    ) {
        val socketId = socketIdAsDouble.toLong()
        val socket = mWebSockets[socketId] ?: return
        if (reason.toByteArray().size > MAX_CLOSE_REASON_BYTES) {
            return
        }
        /**
         * 1005 means "no status". OkHttp cannot send a Close frame with an empty
         * payload, so the frame carries 1000 and the id is recorded to report 1005
         * to JavaScript, which is what the peer would have produced.
         */
        val wireCode =
            if (code == NO_STATUS_RECEIVED) {
                mNoStatusSocketIds.add(socketId)
                NORMAL_CLOSURE
            } else {
                code
            }
        if (!isSendableCloseCode(wireCode)) {
            mNoStatusSocketIds.remove(socketId)
            return
        }
        socket.close(wireCode, reason)
    }

    private inner class SocketListener(
        private val socketId: Long,
        private val listener: WebSocketListener,
    ) : okhttp3.WebSocketListener() {
        override fun onOpen(
            webSocket: WebSocket,
            response: Response,
        ) {
            listener.onOpen(
                response.header("Sec-WebSocket-Protocol") ?: "",
                response.header("Sec-WebSocket-Extensions") ?: "",
            )
        }

        override fun onMessage(
            webSocket: WebSocket,
            text: String,
        ) {
            /**
             * OkHttp exposes no incoming message limit, so it has already
             * buffered this message: the check cannot prevent the first
             * allocation, only stop a peer from repeating it.
             */
            if (text.utf8Size() > MAX_MESSAGE_BYTES) {
                webSocket.close(MESSAGE_TOO_BIG, "")
                return
            }
            listener.onTextMessage(text)
        }

        override fun onMessage(
            webSocket: WebSocket,
            bytes: ByteString,
        ) {
            if (bytes.size > MAX_MESSAGE_BYTES) {
                webSocket.close(MESSAGE_TOO_BIG, "")
                return
            }
            listener.onBinaryMessage(bytes.toByteArray())
        }

        override fun onClosing(
            webSocket: WebSocket,
            code: Int,
            reason: String,
        ) {
            // The peer's code may be 1005, which is illegal to send back.
            webSocket.close(if (isSendableCloseCode(code)) code else NORMAL_CLOSURE, reason)
        }

        override fun onClosed(
            webSocket: WebSocket,
            code: Int,
            reason: String,
        ) {
            val noStatus = mNoStatusSocketIds.remove(socketId)
            settle(socketId)
            listener.onClose(if (noStatus && code == NORMAL_CLOSURE) NO_STATUS_RECEIVED else code, reason, true)
        }

        override fun onFailure(
            webSocket: WebSocket,
            t: Throwable,
            response: Response?,
        ) {
            mNoStatusSocketIds.remove(socketId)
            settle(socketId)
            listener.onError(t.message ?: t.javaClass.simpleName)
            listener.onClose(ABNORMAL_CLOSURE, "", false)
        }
    }

    private fun settle(socketId: Long) {
        mListeners.remove(socketId)
        if (mWebSockets.remove(socketId) == null && mSettledIds.add(socketId)) {
            /**
             * The socket was not stored yet, so `connectWebSocket` has to be told
             * not to store it. A second terminal callback finds the id already in
             * `mSettledIds` and adds nothing.
             */
            mSettledSocketIds.add(socketId)
        }
    }

    /** Mirrors okhttp's `WebSocketProtocol.validateCloseCode`, which throws otherwise. */
    private fun isSendableCloseCode(code: Int): Boolean = code in 1000..4999 && code !in 1004..1006 && code !in 1015..2999

    @DoNotStrip
    @Suppress("SwallowedException")
    fun decodeText(
        bytes: ByteArray,
        label: String,
    ): String? =
        try {
            String(bytes, Charset.forName(label))
        } catch (e: IllegalArgumentException) {
            null
        }

    @DoNotStrip
    fun abortRequest(requestIdAsDouble: Double) {
        val requestId = requestIdAsDouble.toLong()
        mAbortedIds.add(requestId)
        mCalls[requestId]?.cancel()
    }

    @Suppress("LongParameterList")
    private fun buildCall(
        method: String,
        url: String,
        headerNames: Array<String>,
        headerValues: Array<String>,
        body: ByteArray?,
        timeoutMs: Double,
        withCredentials: Boolean,
        listener: NetworkRequestListener,
    ): Call {
        val requestBuilder = Request.Builder().url(url)
        var contentType: MediaType? = null
        for (i in headerNames.indices) {
            requestBuilder.addHeader(headerNames[i], headerValues[i])
            if (headerNames[i].equals("content-type", ignoreCase = true)) {
                contentType = headerValues[i].toMediaTypeOrNull()
            }
        }
        val requestBody =
            when {
                body != null -> ProgressRequestBody(body, contentType, listener)
                method.uppercase() in METHODS_REQUIRING_BODY ->
                    ProgressRequestBody(ByteArray(0), contentType, listener)
                else -> null
            }
        requestBuilder.method(method, requestBody)

        val clientBuilder =
            mClient
                .newBuilder()
                .callTimeout(if (timeoutMs > 0) timeoutMs.toLong() else 0, TimeUnit.MILLISECONDS)
        if (!withCredentials) {
            clientBuilder.cookieJar(CookieJar.NO_COOKIES)
        }
        return clientBuilder.build().newCall(requestBuilder.build())
    }

    private fun handleResponse(
        response: Response,
        listener: NetworkRequestListener,
    ) {
        val headers = response.headers
        val headerNames = Array(headers.size) { headers.name(it) }
        val headerValues = Array(headers.size) { headers.value(it) }
        listener.onResponse(response.code, response.message, headerNames, headerValues, response.request.url.toString())

        val responseBody = response.body
        if (responseBody == null) {
            listener.onComplete(ByteArray(0))
            return
        }

        val contentLength = responseBody.contentLength()
        val source = responseBody.source()
        val output = Buffer()
        var lastProgressAt = 0L
        while (true) {
            val read = source.read(output, READ_BUFFER_SIZE)
            if (read == -1L) {
                break
            }
            val now = System.currentTimeMillis()
            if (now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
                lastProgressAt = now
                listener.onDownloadProgress(output.size, contentLength)
            }
        }

        listener.onComplete(output.readByteArray())
    }

    private fun cleanup(requestId: Long) {
        mCalls.remove(requestId)
        mAbortedIds.remove(requestId)
    }

    private fun errorCode(
        requestId: Long,
        call: Call,
        e: IOException,
    ): Int =
        when {
            mAbortedIds.contains(requestId) -> ERROR_ABORTED
            e is InterruptedIOException -> ERROR_TIMEOUT
            call.isCanceled() -> ERROR_ABORTED
            else -> ERROR_NETWORK
        }

    private class ProgressRequestBody(
        private val body: ByteArray,
        private val contentType: MediaType?,
        private val listener: NetworkRequestListener,
    ) : RequestBody() {
        override fun contentType(): MediaType? = contentType

        override fun contentLength(): Long = body.size.toLong()

        override fun writeTo(sink: BufferedSink) {
            var sent = 0L
            var lastProgressAt = 0L
            val total = body.size.toLong()
            val countingSink =
                object : ForwardingSink(sink) {
                    override fun write(
                        source: Buffer,
                        byteCount: Long,
                    ) {
                        super.write(source, byteCount)
                        sent += byteCount
                        val now = System.currentTimeMillis()
                        if (sent == total || now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
                            lastProgressAt = now
                            listener.onUploadProgress(sent, total)
                        }
                    }
                }
            val bufferedSink = countingSink.buffer()
            bufferedSink.write(body)
            bufferedSink.flush()
            if (sent == 0L) {
                listener.onUploadProgress(0L, 0L)
            }
        }
    }
}
