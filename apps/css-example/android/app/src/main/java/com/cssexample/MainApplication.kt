package com.cssexample

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults
import com.facebook.react.common.assets.ReactFontManager;

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()

    ReactFontManager.getInstance().addCustomFont(this, "Poppins", R.font.poppins)
    ReactFontManager.getInstance().addCustomFont(this, "Ubuntu Mono", R.font.ubuntumono)

    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load(bridgelessEnabled = true)
    }
    // workaround for RN not allowing recursive commits
    // this flag will be removed soon (hopefully)
    ReactNativeFeatureFlags.dangerouslyReset()
    ReactNativeFeatureFlags.override(
      object : ReactNativeNewArchitectureFeatureFlagsDefaults(newArchitectureEnabled = true) {
        override fun useFabricInterop(): Boolean = true

        override fun enableEventEmitterRetentionDuringGesturesOnAndroid(): Boolean =
          true

        override fun allowRecursiveCommitsWithSynchronousMountOnAndroid(): Boolean =
          true
      })
  }
}
