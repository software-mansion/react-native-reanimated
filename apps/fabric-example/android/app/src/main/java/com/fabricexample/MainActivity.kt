package com.fabricexample

import android.os.Bundle
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
      if (MainApplication.runtimeTestsLibrary == null) "FabricExample" else "FabricExampleRuntimeTests"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        // The activity creates its delegate before onCreate reads the launch intent.
        override fun getMainComponentName(): String = this@MainActivity.mainComponentName

        override fun getLaunchOptions(): Bundle? =
            this@MainActivity.intent?.getStringExtra("RUNTIME_TESTS_WS_URL")?.let {
              Bundle().apply { putString("wsUrl", it) }
            }
      }

  override fun onCreate(savedInstanceState: Bundle?) {
    installSplashScreen()
    if (BuildConfig.DEBUG || BuildConfig.RUNTIME_TESTS) {
      intent?.getStringExtra("RUNTIME_TESTS_LIBRARY")?.let {
        MainApplication.runtimeTestsLibrary = it
      }
    }
    super.onCreate(savedInstanceState)

    // Comment out this for now, as react-native-screens goes crazy with
    // screen height measurements when the nav bar is transparent
    // WindowCompat.setDecorFitsSystemWindows(window, false)
  }
}
