package com.swmansion.worklets

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.AssetManager
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.proguard.annotations.DoNotStripAny
import com.facebook.react.ReactApplication
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/** A wrapper around a JavaScript bundle that is backed by a native C++ object. */
@Suppress("KotlinJniMissingFunction")
@SuppressLint("MissingNativeLoadLibrary")
@DoNotStripAny
class ScriptBufferWrapper(
    uri: String?,
    context: Context,
) {
    @field:DoNotStrip
    private val mHybridData: HybridData

    init {
        checkNotNull(uri) {
            "[Worklets] No script URL provided. Make sure the packager is running or you have " +
                "embedded a JS bundle in your application bundle."
        }

        val filePrefix = "file://"
        val absPathPrefix = "/"
        val assetsPrefix = "assets://"

        mHybridData =
            when {
                uri.startsWith(filePrefix) -> {
                    val fileName = uri.substring(filePrefix.length)
                    initHybridFromFile(fileName, fileName)
                }
                uri.startsWith(assetsPrefix) -> {
                    val assetURL = uri.substring(assetsPrefix.length)
                    initHybridFromAssets(context.assets, assetURL)
                }
                uri.startsWith(absPathPrefix) -> {
                    initHybridFromFile(uri, uri)
                }
                else -> {
                    val bundleFile =
                        reactNativeDownloadedBundleFile(context)
                            ?: File(context.cacheDir, DEV_BUNDLE_FILE_NAME).also { downloadScriptToFile(uri, it) }
                    initHybridFromFile(bundleFile.absolutePath, uri)
                }
            }
    }

    private external fun initHybridFromAssets(
        assetManager: AssetManager,
        assetURL: String,
    ): HybridData

    private external fun initHybridFromFile(
        fileName: String,
        sourceURL: String,
    ): HybridData

    companion object {
        private const val DEV_BUNDLE_FILE_NAME = "WorkletsDevBundle.js"
        private const val CONNECT_TIMEOUT_MS = 5_000

        private fun reactNativeDownloadedBundleFile(context: Context): File? {
            val reactApplication = context.applicationContext as? ReactApplication ?: return null
            val bundlePath =
                reactApplication.reactHost
                    ?.devSupportManager
                    ?.downloadedJSBundleFile ?: return null
            return File(bundlePath).takeIf { it.exists() }
        }

        private fun downloadScriptToFile(
            url: String,
            outputFile: File,
        ) {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            try {
                val statusCode =
                    try {
                        connection.responseCode
                    } catch (e: IOException) {
                        throw RuntimeException("[Worklets] Could not connect to development server.\n", e)
                    }
                if (statusCode != 200) {
                    throw RuntimeException(serverErrorMessage(url, statusCode, connection))
                }
                try {
                    val tmpFile = File(outputFile.path + ".tmp")
                    connection.inputStream.use { input ->
                        tmpFile.outputStream().use { output -> input.copyTo(output) }
                    }
                    if (!tmpFile.renameTo(outputFile)) {
                        throw IOException("Couldn't rename $tmpFile to $outputFile")
                    }
                } catch (e: IOException) {
                    throw RuntimeException(
                        "[Worklets] Failed to store worklets bundle from URL $url: ${e.message}",
                        e,
                    )
                }
            } finally {
                connection.disconnect()
            }
        }

        private fun serverErrorMessage(
            url: String,
            statusCode: Int,
            connection: HttpURLConnection,
        ): String {
            val body = connection.errorStream?.use { String(it.readBytes(), StandardCharsets.UTF_8) }
            val metroMessage = parseMetroError(body)
            if (metroMessage != null) {
                return "[Worklets] $metroMessage"
            }
            return "[Worklets] The development server returned response error code: $statusCode\n\n" +
                "URL: $url\n\n" +
                "Body:\n$body"
        }

        private fun parseMetroError(body: String?): String? {
            if (body.isNullOrEmpty()) {
                return null
            }
            return try {
                val json = JSONObject(body)
                val fileName = json.getString("filename").substringAfterLast('/')
                "${json.getString("message")}\n  at $fileName:${json.getInt("lineNumber")}:${json.getInt("column")}"
            } catch (e: JSONException) {
                null
            }
        }
    }
}
