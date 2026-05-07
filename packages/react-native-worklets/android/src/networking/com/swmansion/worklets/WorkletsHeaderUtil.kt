/**
* Based on HeaderUtil.kt from React Native
*/

package com.swmansion.worklets

/**
 * The class purpose is to weaken too strict OkHttp restriction on http headers. See:
 * https://github.com/square/okhttp/issues/2016 Auth headers might have an Authentication
 * information. It is better to get 401 from the server in this case, rather than non descriptive
 * error as 401 could be handled to invalidate the wrong token in the client code.
 */
internal class WorkletsHeaderUtil {
    companion object {
        @JvmStatic
        fun stripHeaderName(name: String): String {
            val builder = StringBuilder(name.length)
            var modified = false
            for (i in 0 until name.length) {
                val c = name[i]
                if (c > '\u0020' && c < '\u007f') {
                    builder.append(c)
                } else {
                    modified = true
                }
            }
            return if (modified) builder.toString() else name
        }

        /**
         * OkHttp's `Headers.Builder.addUnsafeNonAscii` skips byte validation on the
         * value, so it accepts CR / LF / NUL inside header values verbatim and OkHttp
         * will then write the value as-is to the wire. Untrusted header values reaching
         * the network stack must therefore be sanitized here to prevent HTTP request
         * smuggling and response splitting (CWE-113).
         */
        @JvmStatic
        fun stripHeaderValue(value: String): String {
            for (i in 0 until value.length) {
                val c = value[i]
                if (c == '\r' || c == '\n' || c == '\u0000') {
                    val builder = StringBuilder(value.length)
                    for (j in 0 until value.length) {
                        val ch = value[j]
                        if (ch != '\r' && ch != '\n' && ch != '\u0000') {
                            builder.append(ch)
                        }
                    }
                    return builder.toString()
                }
            }
            return value
        }
    }
}
