package com.fabricexample

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class RuntimeTestsSlowAnimationsPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == RuntimeTestsSlowAnimationsModule.NAME) RuntimeTestsSlowAnimationsModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      RuntimeTestsSlowAnimationsModule.NAME to
        ReactModuleInfo(
          name = RuntimeTestsSlowAnimationsModule.NAME,
          className = RuntimeTestsSlowAnimationsModule::class.java.name,
          canOverrideExistingModule = false,
          needsEagerInit = false,
          isCxxModule = false,
          isTurboModule = false,
        )
    )
  }
}
