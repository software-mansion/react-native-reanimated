package com.fabricexample

import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.inspector.WindowInspector
import android.widget.ListView
import androidx.annotation.RequiresApi
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule

/**
 * Sets the slow-animation drag of Reanimated through its dev-menu item, the one switch of the drag. The item toggles
 * the drag, so the module keeps the state that it set. The state of a new React instance is off, as the drag is.
 */
@ReactModule(name = RuntimeTestsSlowAnimationsModule.NAME)
class RuntimeTestsSlowAnimationsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  companion object {
    const val NAME = "RuntimeTestsSlowAnimations"
    private const val DEV_MENU_ITEM = "Toggle slow animations (Reanimated)"
  }

  private class MenuItem(val list: ListView, val position: Int) {
    fun select() {
      list.performItemClick(null, position, list.getItemIdAtPosition(position))
    }
  }

  private var enabled = false

  override fun getName() = NAME

  @ReactMethod
  fun setEnabled(enabled: Boolean, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (this.enabled == enabled) {
        promise.resolve(null)
        return@runOnUiThread
      }
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.reject("E_API_LEVEL", "The dev-menu lookup needs API level 29.")
        return@runOnUiThread
      }
      val item = openDevMenuItem()
      if (item == null) {
        promise.reject("E_NO_DEV_MENU_ITEM", "The dev menu has no item '$DEV_MENU_ITEM'.")
        return@runOnUiThread
      }
      item.select()
      this.enabled = enabled
      promise.resolve(null)
    }
  }

  @RequiresApi(Build.VERSION_CODES.Q)
  private fun openDevMenuItem(): MenuItem? {
    val application = reactApplicationContext.applicationContext as? ReactApplication ?: return null
    val devSupportManager = application.reactHost?.devSupportManager ?: return null
    devSupportManager.showDevOptionsDialog()
    return WindowInspector.getGlobalWindowViews().firstNotNullOfOrNull(::devMenuItemIn)
  }

  private fun devMenuItemIn(view: View): MenuItem? =
    when (view) {
      is ListView ->
        (0 until view.count).firstOrNull { view.getItemAtPosition(it) == DEV_MENU_ITEM }?.let { MenuItem(view, it) }
      is ViewGroup -> (0 until view.childCount).firstNotNullOfOrNull { devMenuItemIn(view.getChildAt(it)) }
      else -> null
    }
}
