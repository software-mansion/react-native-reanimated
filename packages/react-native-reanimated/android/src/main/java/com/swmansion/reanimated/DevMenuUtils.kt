package com.swmansion.reanimated

import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.devsupport.interfaces.DevOptionHandler

object DevMenuUtils {
  @JvmStatic
  fun addDevMenuOption(context: ReactApplicationContext, handler: DevOptionHandler) {
    // In Expo, `ApplicationContext` is not an instance of `ReactApplication`
    if (context.applicationContext is ReactApplication) {
      val devSupportManager =
          (context.applicationContext as ReactApplication).reactHost!!.devSupportManager

      if (devSupportManager != null) {
        devSupportManager.addCustomDevOption("Toggle slow animations (Reanimated)", handler)
      } else {
        throw RuntimeException("[Reanimated] DevSupportManager is not available")
      }
    }
  }
}
