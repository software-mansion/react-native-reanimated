package com.swmansion.worklets.inspector

import android.content.Context
import android.net.Uri
import android.provider.Settings
import com.facebook.react.modules.systeminfo.AndroidInfoHelpers
import com.facebook.react.packagerconnection.PackagerConnectionSettings
import java.util.Locale

/**
 * Describes this app as a device of the Metro inspector proxy, the same way React Native does for
 * its own inspector connection, but with a distinct device id so worklet runtimes are listed
 * separately from the React Native runtime.
 */
object WorkletsInspectorDeviceInfo {
    fun getDeviceName(): String = AndroidInfoHelpers.getFriendlyDeviceName()

    fun getAppName(context: Context): String = context.packageName

    fun getInspectorDeviceUrl(context: Context): String? {
        val host =
            runCatching { PackagerConnectionSettings(context).debugServerHost }
                .getOrNull()
                ?.takeIf { it.isNotEmpty() }
                ?: return null
        val androidId =
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: ""
        val deviceId = "$androidId-${getAppName(context)}-worklets"
        return String.format(
            Locale.US,
            "ws://%s/inspector/device?name=%s&app=%s&device=%s&profiling=false",
            host,
            Uri.encode(getDeviceName()),
            Uri.encode(getAppName(context)),
            Uri.encode(deviceId),
        )
    }
}
