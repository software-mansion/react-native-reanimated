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

class MainApplication : Application(), ReactApplication {

  companion object {
    var runtimeTestsLibrary: String = "reanimated"
  }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
      jsMainModulePath =
        if (BuildConfig.RUNTIME_TESTS) {
          "index.runtimeTests.$runtimeTestsLibrary"
        } else {
          "index"
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.EXPERIMENTAL
    loadReactNative(this)

    ReactFontManager.getInstance().addCustomFont(this, "Poppins", R.font.poppins)
    ReactFontManager.getInstance().addCustomFont(this, "Ubuntu Mono", R.font.ubuntumono)
  }
}
