package com.swmansion.worklets.networking

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
@Suppress("KotlinJniMissingFunction")
class WebSocketListener
    @DoNotStrip
    private constructor(
        @field:DoNotStrip private val mHybridData: HybridData,
    ) {
        external fun onOpen(
            protocol: String,
            extensions: String,
        )

        external fun onFlushed(bytes: Long)

        external fun onTextMessage(message: String)

        external fun onBinaryMessage(message: ByteArray)

        external fun onError(message: String)

        external fun onClose(
            code: Int,
            reason: String,
            wasClean: Boolean,
        )
    }
