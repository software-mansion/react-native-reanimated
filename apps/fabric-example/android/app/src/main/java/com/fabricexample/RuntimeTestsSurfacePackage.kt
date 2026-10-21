package com.fabricexample

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class RuntimeTestsSurfacePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == RuntimeTestsSurfaceModule.NAME) RuntimeTestsSurfaceModule(reactContext) else null

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf(RuntimeTestsThrowingViewManager())

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      RuntimeTestsSurfaceModule.NAME to
        ReactModuleInfo(
          name = RuntimeTestsSurfaceModule.NAME,
          className = RuntimeTestsSurfaceModule::class.java.name,
          canOverrideExistingModule = false,
          needsEagerInit = false,
          isCxxModule = false,
          isTurboModule = false,
        )
    )
  }
}
