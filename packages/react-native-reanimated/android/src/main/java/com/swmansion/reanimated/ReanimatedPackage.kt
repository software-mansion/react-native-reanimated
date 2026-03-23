package com.swmansion.reanimated

import com.facebook.react.BaseReactPackage
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap
import java.util.Objects

class ReanimatedPackage : BaseReactPackage(), ReactPackage {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      when (name) {
        NativeReanimatedModuleSpec.NAME -> ReanimatedModule(reactContext)
        else -> null
      }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    val moduleList: Array<Class<out NativeModule>> = arrayOf(ReanimatedModule::class.java)

    val reactModuleInfoMap = HashMap<String, ReactModuleInfo>()
    for (moduleClass in moduleList) {
      val reactModule = Objects.requireNonNull(moduleClass.getAnnotation(ReactModule::class.java))!!

      reactModuleInfoMap[reactModule.name] =
          ReactModuleInfo(
              reactModule.name,
              moduleClass.name,
              reactModule.canOverrideExistingModule,
              reactModule.needsEagerInit,
              reactModule.isCxxModule,
              true)
    }

    return ReactModuleInfoProvider { reactModuleInfoMap }
  }

  /**
   * Get the [ReactInstanceManager] used by this app. By default, assumes
   * [ReactApplicationContext.getApplicationContext] is an instance of [ReactApplication] and calls
   * [ReactApplication.getReactNativeHost().getReactInstanceManager()]. Override this method if your
   * application class does not implement `ReactApplication` or you simply have a different
   * mechanism for storing a `ReactInstanceManager`, e.g. as a static field somewhere.
   */
  fun getReactInstanceManager(reactContext: ReactApplicationContext): ReactInstanceManager =
      (reactContext.applicationContext as ReactApplication).reactNativeHost.reactInstanceManager
}
