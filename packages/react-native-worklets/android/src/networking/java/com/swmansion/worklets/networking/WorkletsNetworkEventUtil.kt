/**
* Based on NetworkEventUtil.kt from React Native 
*/

@file:Suppress("DEPRECATION_ERROR") // Conflicting okhttp versions

package com.swmansion.worklets.networking

import android.os.Bundle
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.buildReadableArray
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import java.net.SocketTimeoutException
import okhttp3.Headers
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response

/**
 * Utility class for reporting network lifecycle events to JavaScript and InspectorNetworkReporter.
 */
internal object WorkletsNetworkEventUtil {
  @JvmStatic
  fun onCreateRequest(devToolsRequestId: String, request: Request) {
    if (ReactNativeFeatureFlags.enableNetworkEventReporting()) {
      val headersMap = okHttpHeadersToMap(request.headers())
//      InspectorNetworkReporter.reportRequestStart(
//          devToolsRequestId,
//          request.url().toString(),
//          request.method(),
//          headersMap,
//          (request.body() as? ProgressRequestBody)?.getBodyPreview()
//              ?: request.body()?.toString().orEmpty(),
//          request.body()?.contentLength() ?: 0,
//      )
//      InspectorNetworkReporter.reportConnectionTiming(devToolsRequestId, headersMap)
    }
  }

  @JvmStatic
  fun onDataSend(
runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      progress: Long,
      total: Long,
  ) {
    runtimeWrapper.emitDeviceEvent(
        "didSendNetworkData",
        buildReadableArray {
          add(requestId)
          add(progress.toInt())
          add(total.toInt())
        },
    )
  }

  @JvmStatic
  fun onIncrementalDataReceived(
runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      devToolsRequestId: String,
      data: String?,
      progress: Long,
      total: Long,
  ) {
//    if (ReactNativeFeatureFlags.enableNetworkEventReporting() && data != null) {
//      InspectorNetworkReporter.reportDataReceived(devToolsRequestId, data)
//      InspectorNetworkReporter.maybeStoreResponseBodyIncremental(devToolsRequestId, data)
//    }
    runtimeWrapper.emitDeviceEvent(
        "didReceiveNetworkIncrementalData",
        buildReadableArray {
          add(requestId)
          add(data)
          add(progress.toInt())
          add(total.toInt())
        },
    )
  }

  @JvmStatic
  fun onDataReceivedProgress(
runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      progress: Long,
      total: Long,
  ) {
    runtimeWrapper.emitDeviceEvent(
        "didReceiveNetworkDataProgress",
        buildReadableArray {
          add(requestId)
          add(progress.toInt())
          add(total.toInt())
        },
    )
  }

  @JvmStatic
  fun onDataReceived(
runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      devToolsRequestId: String,
      data: String?,
      responseType: String,
  ) {
//    if (ReactNativeFeatureFlags.enableNetworkEventReporting()) {
//      InspectorNetworkReporter.maybeStoreResponseBody(
//          devToolsRequestId,
//          data.orEmpty(),
//          responseType == "base64",
//      )
//    }
    runtimeWrapper.emitDeviceEvent(
        "didReceiveNetworkData",
        buildReadableArray {
          add(requestId)
          add(data)
        },
    )
  }

  @JvmStatic
  fun onDataReceived(
runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      devToolsRequestId: String,
      data: WritableMap,
      rawData: ByteArray,
  ) {
//    if (ReactNativeFeatureFlags.enableNetworkEventReporting()) {
//      InspectorNetworkReporter.maybeStoreResponseBody(
//          devToolsRequestId,
//          Base64.encodeToString(rawData, Base64.NO_WRAP),
//          true,
//      )
//    }
    runtimeWrapper.emitDeviceEvent(
        "didReceiveNetworkData",
        Arguments.createArray().apply {
          pushInt(requestId)
          pushMap(data)
        },
    )
  }

  @JvmStatic
  fun onRequestError(
      runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      devToolsRequestId: String,
      error: String?,
      e: Throwable?,
  ) {
//    if (ReactNativeFeatureFlags.enableNetworkEventReporting()) {
//      InspectorNetworkReporter.reportRequestFailed(devToolsRequestId, false)
//    }
//    runtimeWrapper.emitDeviceEvent(
      runtimeWrapper.emitDeviceEvent(
        "didCompleteNetworkResponse",
        buildReadableArray {
          add(requestId)
          add(error)
          if (e?.javaClass == SocketTimeoutException::class.java) {
            add(true) // last argument is a time out boolean
          }
        },
    )
  }

  @JvmStatic
  fun onRequestSuccess(
runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      devToolsRequestId: String,
      encodedDataLength: Long,
  ) {
//    if (ReactNativeFeatureFlags.enableNetworkEventReporting()) {
//      InspectorNetworkReporter.reportResponseEnd(devToolsRequestId, encodedDataLength)
//    }
    runtimeWrapper.emitDeviceEvent(
        "didCompleteNetworkResponse",
        buildReadableArray {
          add(requestId)
          addNull()
        },
    )
  }

  @JvmStatic
  fun onResponseReceived(
runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      devToolsRequestId: String,
      requestUrl: String?,
      response: Response,
  ) {
    val headersMap = okHttpHeadersToMap(response.headers())
    val headersBundle = Bundle()
    for ((headerName, headerValue) in headersMap) {
      headersBundle.putString(headerName, headerValue)
    }

//    if (ReactNativeFeatureFlags.enableNetworkEventReporting()) {
//      InspectorNetworkReporter.reportResponseStart(
//          devToolsRequestId,
//          requestUrl.orEmpty(),
//          response.code(),
//          headersMap,
//          response.body()?.contentLength() ?: 0,
//      )
//    }
    runtimeWrapper.emitDeviceEvent(
        "didReceiveNetworkResponse",
        Arguments.createArray().apply {
          pushInt(requestId)
          pushInt(response.code())
          pushMap(Arguments.fromBundle(headersBundle))
          pushString(requestUrl)
        },
    )
  }

  @Deprecated("Compatibility overload")
  @JvmStatic
  fun onResponseReceived(
runtimeWrapper: WorkletRuntimeWrapper,
      requestId: Int,
      devToolsRequestId: String,
      statusCode: Int,
      headers: WritableMap?,
      url: String?,
  ) {
    val headersBuilder = Headers.Builder()
    headers?.let { map ->
      val iterator = map.keySetIterator()
      while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        val value = map.getString(key)
        if (value != null) {
          headersBuilder.add(key, value)
        }
      }
    }
    onResponseReceived(
        runtimeWrapper,
        requestId,
        devToolsRequestId,
        url,
        Response.Builder()
            .protocol(Protocol.HTTP_1_1)
            .request(Request.Builder().url(url.orEmpty()).build())
            .headers(headersBuilder.build())
            .code(statusCode)
            .message("")
            .build(),
    )
  }

  private fun okHttpHeadersToMap(headers: Headers): Map<String, String> {
    val responseHeaders = mutableMapOf<String, String>()
    for (i in 0 until headers.size()) {
      val headerName = headers.name(i)
      // multiple values for the same header
      if (responseHeaders.containsKey(headerName)) {
        responseHeaders[headerName] = "${responseHeaders[headerName]}, ${headers.value(i)}"
      } else {
        responseHeaders[headerName] = headers.value(i)
      }
    }
    return responseHeaders
  }
}
