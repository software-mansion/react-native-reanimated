package com.fabricexample

import android.os.Bundle
import android.preference.PreferenceManager
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String =
      if (MainApplication.runtimeTestsLibrary == null) "FabricExample" else "FabricExampleRuntimeTests"

  /**
   * Returns the instance of the [ReactActivityDelegate].
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName) {
        // The activity creates its delegate before onCreate reads the launch intent.
        override fun getMainComponentName(): String = this@MainActivity.mainComponentName

        override fun getLaunchOptions(): Bundle? =
            if (MainApplication.runtimeTestsLibrary == null) {
              null
            } else {
              this@MainActivity.intent?.getStringExtra("RUNTIME_TESTS_WS_URL")?.let {
                Bundle().apply { putString("wsUrl", it) }
              }
            }
      }

  override fun onCreate(savedInstanceState: Bundle?) {
    installSplashScreen()
    if (BuildConfig.DEBUG || BuildConfig.RUNTIME_TESTS) {
      intent?.getStringExtra("RUNTIME_TESTS_LIBRARY")?.let {
        MainApplication.runtimeTestsLibrary = it
      }
    }
    applyRuntimeTestsBundlerHost()
    super.onCreate(savedInstanceState)

    // Comment out this for now, as react-native-screens goes crazy with
    // screen height measurements when the nav bar is transparent
    // WindowCompat.setDecorFitsSystemWindows(window, false)
  }

  /** React Native takes the bundler host from `debug_http_host` before the port of the build. */
  @Suppress("DEPRECATION")
  private fun applyRuntimeTestsBundlerHost() {
    val preferences = PreferenceManager.getDefaultSharedPreferences(this)
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

  private companion object {
    const val BUNDLER_HOST_KEY = "debug_http_host"
    const val SAVED_BUNDLER_HOST_KEY = "runtime_tests_saved_bundler_host"
    const val RUNTIME_TESTS_HOST_KEY = "runtime_tests_bundler_host"
  }
}
