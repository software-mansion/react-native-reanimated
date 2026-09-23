package com.fabricexample

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.uimanager.common.UIManagerType

class RuntimeTestsViewHierarchyPackage : ReactPackage {
  override fun createNativeModules(
      reactContext: ReactApplicationContext
  ): List<NativeModule> = listOf(RuntimeTestsViewHierarchyModule(reactContext))

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}

class RuntimeTestsViewHierarchyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "RuntimeTestsViewHierarchy"

  // A view stays in the mounting manager from its Create until its Delete mutation.
  @ReactMethod
  fun isViewMounted(tag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val uiManager =
          UIManagerHelper.getUIManager(reactApplicationContext, UIManagerType.FABRIC)
              as FabricUIManager
      promise.resolve(uiManager.resolveView(tag.toInt()) != null)
    }
  }
}
