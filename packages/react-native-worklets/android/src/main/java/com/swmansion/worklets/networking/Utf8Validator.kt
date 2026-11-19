package com.swmansion.worklets.networking

internal class Utf8Validator {
    private var remaining = 0
    private var lower = CONTINUATION_LOWER
    private var upper = CONTINUATION_UPPER

    val isComplete: Boolean
        get() = remaining == 0

    fun feed(
        bytes: ByteArray,
        offset: Int,
        length: Int,
    ): Boolean {
        for (i in offset until offset + length) {
            if (!feedByte(bytes[i].toInt() and 0xFF)) {
                return false
            }
        }
        return true
    }

    @Suppress("CyclomaticComplexMethod", "MagicNumber")
    private fun feedByte(byte: Int): Boolean {
        if (remaining > 0) {
            if (byte < lower || byte > upper) {
                return false
            }
            remaining--
            lower = CONTINUATION_LOWER
            upper = CONTINUATION_UPPER
            return true
        }
        when {
            byte < 0x80 -> return true
            byte in 0xC2..0xDF -> remaining = 1
            byte == 0xE0 -> start(2, 0xA0, CONTINUATION_UPPER)
            byte in 0xE1..0xEC || byte in 0xEE..0xEF -> remaining = 2
            byte == 0xED -> start(2, CONTINUATION_LOWER, 0x9F)
            byte == 0xF0 -> start(3, 0x90, CONTINUATION_UPPER)
            byte in 0xF1..0xF3 -> remaining = 3
            byte == 0xF4 -> start(3, CONTINUATION_LOWER, 0x8F)
            else -> return false
        }
        return true
    }

    private fun start(
        count: Int,
        nextLower: Int,
        nextUpper: Int,
    ) {
        remaining = count
        lower = nextLower
        upper = nextUpper
    }

    private companion object {
        const val CONTINUATION_LOWER = 0x80
        const val CONTINUATION_UPPER = 0xBF
    }
}
