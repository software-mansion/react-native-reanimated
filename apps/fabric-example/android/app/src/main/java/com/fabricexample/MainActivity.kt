package com.fabricexample

import android.os.Bundle
import android.preference.PreferenceManager
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String =
      if (BuildConfig.RUNTIME_TESTS) "FabricExampleRuntimeTests" else "FabricExample"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    installSplashScreen()
    if (BuildConfig.RUNTIME_TESTS) {
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
        if (BuildConfig.RUNTIME_TESTS) {
          intent?.getStringExtra("RUNTIME_TESTS_BUNDLER_HOST")
        } else {
          null
        }
    if (host != null) {
      preferences
          .edit()
          .putString(BUNDLER_HOST_KEY, host)
          .putBoolean(RUNTIME_TESTS_HOST_KEY, true)
          .commit()
    } else if (preferences.getBoolean(RUNTIME_TESTS_HOST_KEY, false)) {
      preferences.edit().remove(BUNDLER_HOST_KEY).remove(RUNTIME_TESTS_HOST_KEY).commit()
    }
  }

  private companion object {
    const val BUNDLER_HOST_KEY = "debug_http_host"
    const val RUNTIME_TESTS_HOST_KEY = "runtime_tests_bundler_host"
  }
}
