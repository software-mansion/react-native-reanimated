package com.swmansion.worklets.networking

import android.util.Base64
import java.io.BufferedInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.EOFException
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.CookieHandler
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.ProxySelector
import java.net.Socket
import java.net.SocketTimeoutException
import java.net.URI
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicBoolean
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory

@Suppress("TooManyFunctions")
internal class WorkletsWebSocket(
    private val url: String,
    private val protocols: List<String>,
    private val headers: List<Pair<String, String>>,
    private val cookieHandler: CookieHandler?,
    private val listener: WebSocketListener,
    private val onSettled: () -> Unit,
) {
    private val lock = Any()
    private val settled = AtomicBoolean(false)
    private val random = SecureRandom()
    private val writer: ExecutorService =
        Executors.newSingleThreadExecutor { runnable -> Thread(runnable, "WorkletsWebSocketWriter") }
    private var socket: Socket? = null
    private var input: DataInputStream? = null
    private var output: OutputStream? = null
    private var closeSent = false
    private var failed = false

    fun connect() {
        Thread({ run() }, "WorkletsWebSocketReader").start()
    }

    fun sendText(message: ByteArray) {
        enqueueData(OPCODE_TEXT, message)
    }

    fun sendBinary(message: ByteArray) {
        enqueueData(OPCODE_BINARY, message)
    }

    fun close(
        code: Int,
        reason: String,
    ) {
        val connecting: Boolean
        synchronized(lock) {
            if (closeSent) {
                return
            }
            closeSent = true
            connecting = output == null
        }
        if (connecting) {
            abort("The socket was closed before the connection was established.")
            return
        }
        val payload =
            if (code == CLOSE_NO_STATUS) {
                ByteArray(0)
            } else {
                closePayload(code, reason.toByteArray(Charsets.UTF_8))
            }
        enqueue {
            writeFrame(OPCODE_CLOSE, payload)
            synchronized(lock) { socket?.soTimeout = CLOSE_TIMEOUT_MS }
        }
    }

    fun cancel() {
        abort("The socket was cancelled.")
    }

    @Suppress("TooGenericExceptionCaught")
    private fun run() {
        val protocol: String
        try {
            val uri = parseUrl(url)
            val connected = openSocket(uri)
            val stale =
                synchronized(lock) {
                    if (settled.get() || closeSent) {
                        true
                    } else {
                        socket = connected
                        input = DataInputStream(BufferedInputStream(connected.getInputStream()))
                        output = connected.getOutputStream()
                        false
                    }
                }
            if (stale) {
                closeQuietly(connected)
                return
            }
            protocol = handshake(uri)
        } catch (e: Exception) {
            abort(e.message ?: e.javaClass.simpleName)
            return
        }
        if (settled.get()) {
            return
        }
        listener.onOpen(protocol, "")
        try {
            readFrames()
        } catch (e: SocketTimeoutException) {
            abort("The peer did not complete the closing handshake.")
        } catch (e: IOException) {
            abort(e.message ?: e.javaClass.simpleName)
        }
    }

    private fun openSocket(uri: URI): Socket {
        val port = portOf(uri)
        val proxy = selectProxy(uri, port)
        val raw =
            when (proxy.type()) {
                Proxy.Type.HTTP -> {
                    val plain = Socket()
                    plain.connect(proxy.address(), CONNECT_TIMEOUT_MS)
                    tunnelThroughProxy(plain, uri.host, port)
                    plain
                }
                Proxy.Type.SOCKS -> {
                    val viaSocks = Socket(proxy)
                    viaSocks.connect(InetSocketAddress(uri.host, port), CONNECT_TIMEOUT_MS)
                    viaSocks
                }
                else -> {
                    val plain = Socket()
                    plain.connect(InetSocketAddress(uri.host, port), CONNECT_TIMEOUT_MS)
                    plain
                }
            }
        raw.tcpNoDelay = true
        if (uri.scheme != "wss") {
            return raw
        }
        val factory = SSLSocketFactory.getDefault() as SSLSocketFactory
        val tls = factory.createSocket(raw, uri.host, port, true) as SSLSocket
        val parameters = tls.sslParameters
        parameters.endpointIdentificationAlgorithm = "HTTPS"
        tls.sslParameters = parameters
        tls.startHandshake()
        return tls
    }

    private fun selectProxy(
        uri: URI,
        port: Int,
    ): Proxy {
        val selector = ProxySelector.getDefault() ?: return Proxy.NO_PROXY
        val proxies = selector.select(URI("${httpScheme(uri)}://${uri.host}:$port"))
        return proxies.firstOrNull { it.type() != Proxy.Type.DIRECT } ?: Proxy.NO_PROXY
    }

    private fun tunnelThroughProxy(
        plain: Socket,
        host: String,
        port: Int,
    ) {
        val request = "CONNECT $host:$port HTTP/1.1\r\nHost: $host:$port\r\n\r\n"
        plain.getOutputStream().write(request.toByteArray(Charsets.ISO_8859_1))
        plain.getOutputStream().flush()
        val response = readHttpResponse(DataInputStream(plain.getInputStream()))
        if (response.statusCode != HTTP_OK) {
            throw IOException("The proxy refused the tunnel: ${response.statusLine}")
        }
    }

    private fun handshake(uri: URI): String {
        val out = checkNotNull(output)
        val keyBytes = ByteArray(WEBSOCKET_KEY_BYTES)
        random.nextBytes(keyBytes)
        val key = Base64.encodeToString(keyBytes, Base64.NO_WRAP)
        val request = StringBuilder()
        request.append("GET ").append(requestTarget(uri)).append(" HTTP/1.1\r\n")
        request.append("Host: ").append(hostHeader(uri)).append("\r\n")
        request.append("Upgrade: websocket\r\n")
        request.append("Connection: Upgrade\r\n")
        request.append("Sec-WebSocket-Key: ").append(key).append("\r\n")
        request.append("Sec-WebSocket-Version: 13\r\n")
        if (protocols.isNotEmpty()) {
            request.append("Sec-WebSocket-Protocol: ").append(protocols.joinToString(", ")).append("\r\n")
        }
        val cookieUri = cookieUri(uri)
        cookieHandler?.get(cookieUri, emptyMap())?.forEach { (name, values) ->
            if (name != null && values.isNotEmpty()) {
                request
                    .append(name)
                    .append(": ")
                    .append(values.joinToString("; "))
                    .append("\r\n")
            }
        }
        for ((name, value) in headers) {
            request
                .append(name)
                .append(": ")
                .append(value)
                .append("\r\n")
        }
        request.append("\r\n")
        out.write(request.toString().toByteArray(Charsets.UTF_8))
        out.flush()

        val response = readHttpResponse(checkNotNull(input))
        if (response.statusCode != HTTP_SWITCHING_PROTOCOLS) {
            throw IOException("Expected HTTP 101 response but was '${response.statusLine}'")
        }
        val upgrade = response.header("Upgrade")
        if (!upgrade.equals("websocket", ignoreCase = true)) {
            throw IOException("Expected 'Upgrade' header value 'websocket' but was '$upgrade'")
        }
        val connection = response.header("Connection") ?: ""
        if (connection.split(',').none { it.trim().equals("upgrade", ignoreCase = true) }) {
            throw IOException("Expected 'Connection' header value 'Upgrade' but was '$connection'")
        }
        val digest = MessageDigest.getInstance("SHA-1").digest((key + WEBSOCKET_GUID).toByteArray(Charsets.US_ASCII))
        val expectedAccept = Base64.encodeToString(digest, Base64.NO_WRAP)
        val accept = response.header("Sec-WebSocket-Accept")
        if (accept != expectedAccept) {
            throw IOException("Expected 'Sec-WebSocket-Accept' header value '$expectedAccept' but was '$accept'")
        }
        if (response.header("Sec-WebSocket-Extensions") != null) {
            throw IOException("The server negotiated an extension that was not requested.")
        }
        val protocol = response.header("Sec-WebSocket-Protocol") ?: ""
        if (protocol.isNotEmpty() && protocols.none { it == protocol }) {
            throw IOException("The server selected a subprotocol that was not requested: '$protocol'")
        }
        cookieHandler?.put(cookieUri, response.headers)
        return protocol
    }

    private class HttpResponse(
        val statusLine: String,
        val statusCode: Int,
        val headers: Map<String, List<String>>,
    ) {
        fun header(name: String): String? =
            headers.entries
                .firstOrNull { it.key.equals(name, ignoreCase = true) }
                ?.value
                ?.joinToString(", ")
    }

    private fun readHttpResponse(stream: DataInputStream): HttpResponse {
        val statusLine = readLine(stream)
        val parts = statusLine.split(' ', limit = STATUS_LINE_PARTS)
        if (parts.size < 2 || !parts[0].startsWith("HTTP/1.")) {
            throw IOException("Unexpected status line '$statusLine'")
        }
        val statusCode = parts[1].toIntOrNull() ?: throw IOException("Unexpected status line '$statusLine'")
        val headers = LinkedHashMap<String, MutableList<String>>()
        var total = statusLine.length
        while (true) {
            val line = readLine(stream)
            if (line.isEmpty()) {
                break
            }
            total += line.length
            if (total > MAX_HANDSHAKE_BYTES) {
                throw IOException("The handshake response is too large.")
            }
            val colon = line.indexOf(':')
            if (colon <= 0) {
                throw IOException("Unexpected header line '$line'")
            }
            val name = line.substring(0, colon).trim()
            val value = line.substring(colon + 1).trim()
            headers.getOrPut(name) { mutableListOf() }.add(value)
        }
        return HttpResponse(statusLine, statusCode, headers)
    }

    private fun readLine(stream: InputStream): String {
        val buffer = ByteArrayOutputStream()
        while (true) {
            val byte = stream.read()
            if (byte == -1) {
                throw EOFException("The connection closed during the handshake.")
            }
            if (byte == '\n'.code) {
                break
            }
            buffer.write(byte)
            if (buffer.size() > MAX_HANDSHAKE_BYTES) {
                throw IOException("The handshake response is too large.")
            }
        }
        return buffer.toString(Charsets.ISO_8859_1.name()).trimEnd('\r')
    }

    @Suppress("CyclomaticComplexMethod", "LongMethod", "NestedBlockDepth", "ReturnCount")
    private fun readFrames() {
        val stream = checkNotNull(input)
        var messageOpcode = -1
        val message = ByteArrayOutputStream()
        val validator = Utf8Validator()
        while (true) {
            val first = stream.readUnsignedByte()
            val second = stream.readUnsignedByte()
            val fin = first and FIN_BIT != 0
            if (first and RSV_BITS != 0) {
                protocolError("The peer used a reserved bit.")
                return
            }
            val opcode = first and OPCODE_MASK
            if (second and MASK_BIT != 0) {
                protocolError("The peer sent a masked frame.")
                return
            }
            val length = readPayloadLength(second and LENGTH_MASK, stream) ?: return
            val isControl = opcode and CONTROL_OPCODE_BIT != 0
            if (isControl && (!fin || length > MAX_CONTROL_PAYLOAD)) {
                protocolError("The peer sent an invalid control frame.")
                return
            }
            if (opcode !in KNOWN_OPCODES) {
                protocolError("The peer used an unknown opcode: $opcode.")
                return
            }
            if (isControl) {
                val payload = ByteArray(length.toInt())
                stream.readFully(payload)
                when (opcode) {
                    OPCODE_CLOSE -> {
                        handleClose(payload)
                        return
                    }
                    OPCODE_PING -> enqueue { writeFrame(OPCODE_PONG, payload) }
                    else -> Unit
                }
                continue
            }
            if (opcode == OPCODE_CONTINUATION) {
                if (messageOpcode == -1) {
                    protocolError("The peer sent a continuation frame without a message.")
                    return
                }
            } else {
                if (messageOpcode != -1) {
                    protocolError("The peer started a message inside a fragmented message.")
                    return
                }
                messageOpcode = opcode
            }
            if (message.size() + length > MAX_MESSAGE_BYTES) {
                fail("The peer sent a message larger than $MAX_MESSAGE_BYTES bytes.", CLOSE_MESSAGE_TOO_BIG)
                return
            }
            val chunk = ByteArray(length.toInt())
            stream.readFully(chunk)
            if (messageOpcode == OPCODE_TEXT && !validator.feed(chunk, 0, chunk.size)) {
                fail("The peer sent a text frame that is not valid UTF-8.", CLOSE_INVALID_PAYLOAD)
                return
            }
            message.write(chunk)
            if (!fin) {
                continue
            }
            if (messageOpcode == OPCODE_TEXT) {
                if (!validator.isComplete) {
                    fail("The peer sent a text frame that is not valid UTF-8.", CLOSE_INVALID_PAYLOAD)
                    return
                }
                listener.onTextMessage(String(message.toByteArray(), Charsets.UTF_8))
            } else {
                listener.onBinaryMessage(message.toByteArray())
            }
            message.reset()
            messageOpcode = -1
        }
    }

    private fun readPayloadLength(
        indicator: Int,
        stream: DataInputStream,
    ): Long? {
        val length =
            when (indicator) {
                LENGTH_16_BIT -> stream.readUnsignedShort().toLong()
                LENGTH_64_BIT -> stream.readLong()
                else -> indicator.toLong()
            }
        if (length < 0) {
            protocolError("The peer sent a frame with a negative length.")
            return null
        }
        if (length > MAX_MESSAGE_BYTES) {
            fail("The peer sent a frame larger than $MAX_MESSAGE_BYTES bytes.", CLOSE_MESSAGE_TOO_BIG)
            return null
        }
        return length
    }

    private fun handleClose(payload: ByteArray) {
        if (payload.size == 1) {
            protocolError("The peer sent a Close frame with a one byte payload.")
            return
        }
        var code = CLOSE_NO_STATUS
        var reason = ""
        if (payload.size >= 2) {
            code = ((payload[0].toInt() and BYTE_MASK) shl Byte.SIZE_BITS) or (payload[1].toInt() and BYTE_MASK)
            if (!isValidReceivedCloseCode(code)) {
                protocolError("The peer sent an invalid close code: $code.")
                return
            }
            val validator = Utf8Validator()
            if (!validator.feed(payload, 2, payload.size - 2) || !validator.isComplete) {
                fail("The peer sent a close reason that is not valid UTF-8.", CLOSE_INVALID_PAYLOAD)
                return
            }
            reason = String(payload, 2, payload.size - 2, Charsets.UTF_8)
        }
        val echo: Boolean
        synchronized(lock) {
            echo = !closeSent
            closeSent = true
        }
        if (echo) {
            enqueue {
                writeFrame(OPCODE_CLOSE, payload)
                settle(code, reason, true)
            }
        } else {
            settle(code, reason, true)
        }
    }

    private fun protocolError(message: String) {
        fail(message, CLOSE_PROTOCOL_ERROR)
    }

    private fun fail(
        message: String,
        code: Int,
    ) {
        val sendClose: Boolean
        synchronized(lock) {
            if (failed) {
                return
            }
            failed = true
            sendClose = !closeSent && output != null
            closeSent = true
        }
        listener.onError(message)
        if (sendClose) {
            enqueue {
                writeFrame(OPCODE_CLOSE, closePayload(code, ByteArray(0)))
                settle(code, "", false)
            }
        } else {
            settle(code, "", false)
        }
    }

    private fun abort(message: String) {
        val report: Boolean
        synchronized(lock) {
            report = !failed
            failed = true
            closeSent = true
        }
        if (report) {
            listener.onError(message)
        }
        settle(CLOSE_ABNORMAL, "", false)
    }

    private fun settle(
        code: Int,
        reason: String,
        wasClean: Boolean,
    ) {
        if (!settled.compareAndSet(false, true)) {
            return
        }
        synchronized(lock) {
            closeQuietly(socket)
            socket = null
        }
        writer.shutdown()
        onSettled()
        listener.onClose(code, reason, wasClean)
    }

    private fun enqueueData(
        opcode: Int,
        payload: ByteArray,
    ) {
        synchronized(lock) {
            if (closeSent) {
                return
            }
        }
        enqueue {
            writeFrame(opcode, payload)
            listener.onFlushed(payload.size.toLong())
        }
    }

    @Suppress("SwallowedException")
    private fun enqueue(action: () -> Unit) {
        try {
            writer.execute {
                try {
                    action()
                } catch (e: IOException) {
                    abort(e.message ?: e.javaClass.simpleName)
                }
            }
        } catch (e: RejectedExecutionException) {
            check(settled.get())
        }
    }

    private fun writeFrame(
        opcode: Int,
        payload: ByteArray,
    ) {
        val out = synchronized(lock) { output } ?: throw IOException("The socket is closed.")
        val header = ByteArrayOutputStream()
        header.write(FIN_BIT or opcode)
        when {
            payload.size <= MAX_CONTROL_PAYLOAD -> header.write(MASK_BIT or payload.size)
            payload.size <= MAX_16_BIT_LENGTH -> {
                header.write(MASK_BIT or LENGTH_16_BIT)
                header.write(payload.size ushr Byte.SIZE_BITS)
                header.write(payload.size)
            }
            else -> {
                header.write(MASK_BIT or LENGTH_64_BIT)
                for (shift in (Long.SIZE_BITS - Byte.SIZE_BITS) downTo 0 step Byte.SIZE_BITS) {
                    header.write((payload.size.toLong() ushr shift).toInt())
                }
            }
        }
        val mask = ByteArray(MASK_BYTES)
        random.nextBytes(mask)
        header.write(mask)
        val masked = ByteArray(payload.size)
        for (i in payload.indices) {
            masked[i] = (payload[i].toInt() xor mask[i % MASK_BYTES].toInt()).toByte()
        }
        out.write(header.toByteArray())
        out.write(masked)
        out.flush()
    }

    private fun closePayload(
        code: Int,
        reason: ByteArray,
    ): ByteArray {
        val payload = ByteArray(2 + reason.size)
        payload[0] = (code ushr Byte.SIZE_BITS).toByte()
        payload[1] = code.toByte()
        reason.copyInto(payload, 2)
        return payload
    }

    private fun isValidReceivedCloseCode(code: Int): Boolean =
        code in CLOSE_NORMAL..CLOSE_UNSUPPORTED_DATA ||
            code in CLOSE_INVALID_PAYLOAD..CLOSE_BAD_GATEWAY ||
            code in CLOSE_PRIVATE_RANGE

    @Suppress("SwallowedException")
    private fun closeQuietly(socket: Socket?) {
        try {
            socket?.close()
        } catch (e: IOException) {
            return
        }
    }

    private companion object {
        const val WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        const val WEBSOCKET_KEY_BYTES = 16
        const val DEFAULT_PORT = 80
        const val DEFAULT_TLS_PORT = 443
        const val HTTP_OK = 200
        const val HTTP_SWITCHING_PROTOCOLS = 101
        const val STATUS_LINE_PARTS = 3
        const val CONNECT_TIMEOUT_MS = 30_000
        const val CLOSE_TIMEOUT_MS = 60_000
        const val MAX_HANDSHAKE_BYTES = 64 * 1024
        const val MAX_MESSAGE_BYTES = 16 * 1024 * 1024
        const val MAX_CONTROL_PAYLOAD = 125
        const val MAX_16_BIT_LENGTH = 0xFFFF
        const val MASK_BYTES = 4
        const val BYTE_MASK = 0xFF

        const val FIN_BIT = 0x80
        const val RSV_BITS = 0x70
        const val OPCODE_MASK = 0x0F
        const val MASK_BIT = 0x80
        const val LENGTH_MASK = 0x7F
        const val LENGTH_16_BIT = 126
        const val LENGTH_64_BIT = 127
        const val CONTROL_OPCODE_BIT = 0x08

        const val OPCODE_CONTINUATION = 0x0
        const val OPCODE_TEXT = 0x1
        const val OPCODE_BINARY = 0x2
        const val OPCODE_CLOSE = 0x8
        const val OPCODE_PING = 0x9
        const val OPCODE_PONG = 0xA
        val KNOWN_OPCODES = setOf(OPCODE_CONTINUATION, OPCODE_TEXT, OPCODE_BINARY, OPCODE_CLOSE, OPCODE_PING, OPCODE_PONG)

        const val CLOSE_NORMAL = 1000
        const val CLOSE_PROTOCOL_ERROR = 1002
        const val CLOSE_UNSUPPORTED_DATA = 1003
        const val CLOSE_NO_STATUS = 1005
        const val CLOSE_ABNORMAL = 1006
        const val CLOSE_INVALID_PAYLOAD = 1007
        const val CLOSE_MESSAGE_TOO_BIG = 1009
        const val CLOSE_BAD_GATEWAY = 1014
        val CLOSE_PRIVATE_RANGE = 3000..4999

        fun parseUrl(url: String): URI {
            val uri = URI(url)
            if (uri.scheme != "ws" && uri.scheme != "wss") {
                throw IOException("Unsupported URL scheme: ${uri.scheme}")
            }
            if (uri.host.isNullOrEmpty()) {
                throw IOException("The URL has no host.")
            }
            return uri
        }

        fun httpScheme(uri: URI): String = if (uri.scheme == "wss") "https" else "http"

        fun portOf(uri: URI): Int =
            when {
                uri.port != -1 -> uri.port
                uri.scheme == "wss" -> DEFAULT_TLS_PORT
                else -> DEFAULT_PORT
            }

        fun requestTarget(uri: URI): String {
            val path = uri.rawPath.ifEmpty { "/" }
            return if (uri.rawQuery != null) "$path?${uri.rawQuery}" else path
        }

        fun hostHeader(uri: URI): String {
            val host = if (uri.host.contains(':')) "[${uri.host.trim('[', ']')}]" else uri.host
            val defaultPort = if (uri.scheme == "wss") DEFAULT_TLS_PORT else DEFAULT_PORT
            return if (uri.port == -1 || uri.port == defaultPort) host else "$host:${uri.port}"
        }

        fun cookieUri(uri: URI): URI = URI(httpScheme(uri), uri.rawAuthority, uri.rawPath.ifEmpty { "/" }, uri.rawQuery, null)
    }
}
