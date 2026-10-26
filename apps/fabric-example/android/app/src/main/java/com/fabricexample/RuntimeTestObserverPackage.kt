package com.fabricexample

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class RuntimeTestObserverPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == RuntimeTestObserverModule.NAME) RuntimeTestObserverModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      RuntimeTestObserverModule.NAME to ReactModuleInfo(
        RuntimeTestObserverModule.NAME,
        RuntimeTestObserverModule::class.java.name,
        false,
        false,
        false,
        true,
      )
    )
  }
}
