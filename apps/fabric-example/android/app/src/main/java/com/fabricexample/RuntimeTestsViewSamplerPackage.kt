package com.fabricexample

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class RuntimeTestsViewSamplerPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == RuntimeTestsViewSamplerModule.NAME) RuntimeTestsViewSamplerModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      RuntimeTestsViewSamplerModule.NAME to
        ReactModuleInfo(
          name = RuntimeTestsViewSamplerModule.NAME,
          className = RuntimeTestsViewSamplerModule::class.java.name,
          canOverrideExistingModule = false,
          needsEagerInit = false,
          isCxxModule = false,
          isTurboModule = false,
        )
    )
  }
}
