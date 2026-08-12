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
import okio.Buffer
import okio.BufferedSink
import okio.ForwardingSink
import okio.buffer
import java.io.IOException
import java.io.InterruptedIOException
import java.nio.charset.StandardCharsets
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class WorkletsNetworking {
    companion object {
        private const val ERROR_NETWORK = 0
        private const val ERROR_TIMEOUT = 1
        private const val ERROR_ABORTED = 2
        private const val PROGRESS_INTERVAL_MS = 100L
        private const val READ_BUFFER_SIZE = 65536L
        private val METHODS_REQUIRING_BODY = setOf("POST", "PUT", "PATCH")
    }

    private val mClient: OkHttpClient by lazy {
        val client = OkHttpClientProvider.createClient()
        (client.cookieJar as? CookieJarContainer)?.setCookieJar(JavaNetCookieJar(ForwardingCookieHandler()))
        client
    }
    private val mCalls = ConcurrentHashMap<Long, Call>()
    private val mAbortedIds: MutableSet<Long> = Collections.newSetFromMap(ConcurrentHashMap())

    @DoNotStrip
    fun sendRequest(
        requestIdAsDouble: Double,
        method: String,
        url: String,
        headerNames: Array<String>,
        headerValues: Array<String>,
        body: ByteArray?,
        useBytesResponse: Boolean,
        timeoutMs: Double,
        withCredentials: Boolean,
        listener: NetworkRequestListener,
    ) {
        val requestId = requestIdAsDouble.toLong()
        try {
            val requestBuilder = Request.Builder().url(url)
            var contentType: MediaType? = null
            for (i in headerNames.indices) {
                requestBuilder.addHeader(headerNames[i], headerValues[i])
                if (headerNames[i].equals("content-type", ignoreCase = true)) {
                    contentType = headerValues[i].toMediaTypeOrNull()
                }
            }
            val normalizedMethod = method.uppercase()
            val requestBody =
                when {
                    body != null -> ProgressRequestBody(body, contentType, listener)
                    normalizedMethod in METHODS_REQUIRING_BODY -> ProgressRequestBody(ByteArray(0), contentType, listener)
                    else -> null
                }
            requestBuilder.method(normalizedMethod, requestBody)

            val clientBuilder =
                mClient
                    .newBuilder()
                    .callTimeout(if (timeoutMs > 0) timeoutMs.toLong() else 0, TimeUnit.MILLISECONDS)
            if (!withCredentials) {
                clientBuilder.cookieJar(CookieJar.NO_COOKIES)
            }

            val call = clientBuilder.build().newCall(requestBuilder.build())
            mCalls[requestId] = call
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
                            response.use { handleResponse(it, useBytesResponse, listener) }
                        } catch (t: Throwable) {
                            val code =
                                if (t is IOException) {
                                    errorCode(requestId, call, t)
                                } else {
                                    ERROR_NETWORK
                                }
                            listener.onError(code, t.message ?: t.javaClass.simpleName)
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
    fun abortRequest(requestIdAsDouble: Double) {
        val requestId = requestIdAsDouble.toLong()
        val call = mCalls[requestId] ?: return
        mAbortedIds.add(requestId)
        call.cancel()
    }

    private fun handleResponse(
        response: Response,
        useBytesResponse: Boolean,
        listener: NetworkRequestListener,
    ) {
        val headers = response.headers
        val headerNames = Array(headers.size) { headers.name(it) }
        val headerValues = Array(headers.size) { headers.value(it) }
        listener.onResponse(response.code, response.message, headerNames, headerValues, response.request.url.toString())

        val responseBody = response.body
        if (responseBody == null) {
            if (useBytesResponse) {
                listener.onCompleteBytes(ByteArray(0))
            } else {
                listener.onCompleteText("")
            }
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

        if (useBytesResponse) {
            listener.onCompleteBytes(output.readByteArray())
        } else {
            val charset = responseBody.contentType()?.charset(StandardCharsets.UTF_8) ?: StandardCharsets.UTF_8
            listener.onCompleteText(output.readString(charset))
        }
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
            mAbortedIds.remove(requestId) -> ERROR_ABORTED
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
        }
    }
}
