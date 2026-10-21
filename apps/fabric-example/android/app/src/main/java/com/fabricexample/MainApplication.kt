package com.fabricexample

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.common.assets.ReactFontManager
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Experimental_Android

class MainApplication : Application(), ReactApplication {

  companion object {
    var runtimeTestsLibrary: String? = if (BuildConfig.RUNTIME_TESTS) "reanimated" else null
  }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          if (runtimeTestsLibrary != null) {
            add(0, RuntimeTestObserverPackage())
            add(RuntimeTestsSurfacePackage())
            add(RuntimeTestsViewSamplerPackage())
            add(RuntimeTestsSlowAnimationsPackage())
          }
        },
      jsMainModulePath = runtimeTestsLibrary?.let { "index.runtimeTests.$it" } ?: "index",
      jsBundleAssetPath =
        runtimeTestsLibrary?.let { "main.runtimeTests.$it.jsbundle" } ?: "index.android.bundle",
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.EXPERIMENTAL
    loadReactNative(this)
    if (BuildConfig.MOUNT_THREAD_PULL) {
      ReactNativeFeatureFlags.dangerouslyForceOverride(MountThreadPullFeatureFlags())
    }

    ReactFontManager.getInstance().addCustomFont(this, "Poppins", R.font.poppins)
    ReactFontManager.getInstance().addCustomFont(this, "Ubuntu Mono", R.font.ubuntumono)
  }
}

private class MountThreadPullFeatureFlags : ReactNativeFeatureFlagsOverrides_RNOSS_Experimental_Android() {
  override fun enableMountingCoordinatorPullModelAndroid() = true

  override fun enableAccumulatedUpdatesInRawPropsAndroid() = true
}
