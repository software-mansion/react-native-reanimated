package com.fabricexample

import android.content.Context
import android.content.Intent
import android.preference.PreferenceManager

/** React Native takes the bundler host from `debug_http_host` before the port of the build. */
object RuntimeTestsBundlerHost {
  @Suppress("DEPRECATION")
  fun apply(context: Context, intent: Intent?) {
    val preferences = PreferenceManager.getDefaultSharedPreferences(context)
    val host =
        if (BuildConfig.DEBUG) {
          intent?.getStringExtra("RUNTIME_TESTS_BUNDLER_HOST")
        } else {
          null
        }
    val hasRuntimeTestsHost = preferences.getBoolean(RUNTIME_TESTS_HOST_KEY, false)
    if (host != null) {
      val editor = preferences.edit()
      if (!hasRuntimeTestsHost) {
        editor.putString(SAVED_BUNDLER_HOST_KEY, preferences.getString(BUNDLER_HOST_KEY, null))
      }
      editor.putString(BUNDLER_HOST_KEY, host).putBoolean(RUNTIME_TESTS_HOST_KEY, true).commit()
    } else if (hasRuntimeTestsHost) {
      preferences
          .edit()
          .putString(BUNDLER_HOST_KEY, preferences.getString(SAVED_BUNDLER_HOST_KEY, null))
          .remove(SAVED_BUNDLER_HOST_KEY)
          .remove(RUNTIME_TESTS_HOST_KEY)
          .commit()
    }
  }

  private const val BUNDLER_HOST_KEY = "debug_http_host"
  private const val SAVED_BUNDLER_HOST_KEY = "runtime_tests_saved_bundler_host"
  private const val RUNTIME_TESTS_HOST_KEY = "runtime_tests_bundler_host"
}
