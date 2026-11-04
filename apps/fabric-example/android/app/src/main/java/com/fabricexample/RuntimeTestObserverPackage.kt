package com.fabricexample

import com.facebook.react.BaseReactPackage
import com.facebook.react.ViewManagerOnDemandReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.views.textinput.ReactTextInputManager

class RuntimeTestObserverPackage : BaseReactPackage(), ViewManagerOnDemandReactPackage {
  override fun getViewManagerNames(reactContext: ReactApplicationContext) =
    listOf(ReactTextInputManager.REACT_CLASS)

  override fun createViewManager(
    reactContext: ReactApplicationContext,
    viewManagerName: String
  ): ViewManager<*, *>? =
    if (viewManagerName == ReactTextInputManager.REACT_CLASS) RuntimeTestTextInputManager() else null

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
