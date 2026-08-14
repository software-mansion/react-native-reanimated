package com.swmansion.worklets.networking

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
@Suppress("KotlinJniMissingFunction")
class NetworkRequestListener
    @DoNotStrip
    private constructor(
        @field:DoNotStrip private val mHybridData: HybridData,
    ) {
        external fun onResponse(
            status: Int,
            statusText: String,
            headerNames: Array<String>,
            headerValues: Array<String>,
            url: String,
        )

        external fun onUploadProgress(
            sent: Long,
            total: Long,
        )

        external fun onDownloadProgress(
            received: Long,
            total: Long,
        )

        external fun onCompleteText(body: String)

        external fun onCompleteBytes(body: ByteArray)

        external fun onError(
            errorCode: Int,
            message: String,
        )
    }
