package com.swmansion.worklets

import android.annotation.SuppressLint
import android.content.res.AssetManager
import android.os.Build
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.proguard.annotations.DoNotStripAny
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/** A wrapper around a JavaScript bundle that is backed by a native C++ object. */
@Suppress("KotlinJniMissingFunction")
@SuppressLint("MissingNativeLoadLibrary")
@DoNotStripAny
class ScriptBufferWrapper(uri: String, assetManager: AssetManager) {

    @DoNotStrip
    private val mHybridData: HybridData

    init {
        val filePrefix = "file://"
        val assetsPrefix = "assets://"

        mHybridData = when {
            uri.startsWith(filePrefix) -> {
                val fileName = uri.substring(filePrefix.length)
                initHybridFromFile(fileName)
            }
            uri.startsWith(assetsPrefix) -> {
                val assetURL = uri.substring(assetsPrefix.length)
                initHybridFromAssets(assetManager, assetURL)
            }
            else -> {
                val scriptContent = try {
                    downloadScript(uri)
                } catch (e: IOException) {
                    throw RuntimeException(e)
                }
                initHybridFromString(scriptContent, uri)
            }
        }
    }

    private external fun initHybridFromAssets(assetManager: AssetManager, assetURL: String): HybridData

    private external fun initHybridFromFile(fileName: String): HybridData

    private external fun initHybridFromString(script: String, url: String): HybridData

    companion object {
        private fun downloadScript(url: String): String {
            val scriptUrl = URL(url)
            val connection = scriptUrl.openConnection() as HttpURLConnection
            try {
                val content: ByteArray

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    content = connection.inputStream.readAllBytes()
                } else {
                    content = readBytes(connection.inputStream)
                }

                return String(content, StandardCharsets.UTF_8)
            } finally {
                connection.disconnect()
            }
        }

        /** Reads all bytes from an InputStream into a byte array for SDKs below 33. */
        private fun readBytes(inputStream: InputStream): ByteArray {
            val bufferSize = 4096
            try {
                val byteBuffer = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(bufferSize)
                var len: Int
                while (inputStream.read(buffer).also { len = it } != -1) {
                    byteBuffer.write(buffer, 0, len)
                }
                return byteBuffer.toByteArray()
            } finally {
                inputStream.close()
            }
        }
    }
}
