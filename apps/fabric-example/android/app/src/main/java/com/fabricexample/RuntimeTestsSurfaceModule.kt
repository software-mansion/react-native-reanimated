package com.fabricexample

import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.interfaces.fabric.ReactSurface
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil.dpToPx
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

@OptIn(UnstableReactNativeAPI::class)
@ReactModule(name = RuntimeTestsSurfaceModule.NAME)
class RuntimeTestsSurfaceModule(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), UIManagerListener {

  companion object {
    const val NAME = "RuntimeTestsSurface"
    private const val SURFACE_SIZE_DP = 200f
    private const val STOP_TIMEOUT_SECONDS = 5L
  }

  private val surfaces = mutableMapOf<Int, ReactSurface>()
  private val pendingStarts = mutableMapOf<ReactSurface, Promise>()
  private var observedUIManager: UIManager? = null

  override fun getName() = NAME

  @ReactMethod
  fun start(componentName: String, promise: Promise) {
    UiThreadUtil.runOnUiThread { startOnUiThread(componentName, promise) }
  }

  @ReactMethod
  fun stop(rootTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread { stopOnUiThread(rootTag.toInt(), promise) }
  }

  private fun startOnUiThread(componentName: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "No activity is available.")
      return
    }
    if (observedUIManager() == null) {
      promise.reject("E_NO_UI_MANAGER", "The Fabric UI manager is not available.")
      return
    }

    val reactHost = checkNotNull((activity.application as ReactApplication).reactHost)
    val surface = reactHost.createSurface(activity, componentName, null)
    val size = SURFACE_SIZE_DP.dpToPx().toInt()
    activity
      .findViewById<ViewGroup>(android.R.id.content)
      .addView(checkNotNull(surface.view), FrameLayout.LayoutParams(size, size, Gravity.BOTTOM or Gravity.START))

    pendingStarts[surface] = promise
    surface.start()
  }

  private fun stopOnUiThread(rootTag: Int, promise: Promise) {
    val surface = surfaces.remove(rootTag)
    if (surface == null) {
      promise.reject("E_NO_SURFACE", "No surface has the root tag $rootTag.")
      return
    }
    if (!surface.isRunning) {
      promise.reject("E_NOT_RUNNING", "The surface ${surface.surfaceID} is not running.")
      return
    }

    val stopped = surface.stop()
    surface.view?.let { view -> (view.parent as ViewGroup?)?.removeView(view) }
    thread(name = "RuntimeTestsSurfaceStop") {
      when {
        !stopped.waitForCompletion(STOP_TIMEOUT_SECONDS, TimeUnit.SECONDS) ->
          promise.reject("E_NO_STOP", "The surface $rootTag did not stop in $STOP_TIMEOUT_SECONDS s.")
        stopped.isFaulted() -> promise.reject("E_STOP_FAILED", stopped.getError())
        else -> promise.resolve(null)
      }
    }
  }

  override fun didMountItems(uiManager: UIManager) {
    pendingStarts.entries.removeAll { (surface, promise) ->
      val hasMountedContent = (surface.view?.childCount ?: 0) > 0
      if (hasMountedContent) {
        surfaces[surface.surfaceID] = surface
        promise.resolve(surface.surfaceID)
      }
      hasMountedContent
    }
  }

  override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

  override fun willMountItems(uiManager: UIManager) = Unit

  override fun didDispatchMountItems(uiManager: UIManager) = Unit

  override fun didScheduleMountItems(uiManager: UIManager) = Unit

  override fun invalidate() {
    UiThreadUtil.runOnUiThread {
      observedUIManager?.removeUIManagerEventListener(this)
      observedUIManager = null
      (surfaces.values + pendingStarts.keys).forEach { surface ->
        surface.stop()
        surface.view?.let { view -> (view.parent as ViewGroup?)?.removeView(view) }
      }
      surfaces.clear()
      pendingStarts.clear()
    }
    super.invalidate()
  }

  private fun observedUIManager(): UIManager? {
    if (observedUIManager == null) {
      observedUIManager =
        UIManagerHelper.getUIManager(reactApplicationContext, UIManagerType.FABRIC)?.also {
          it.addUIManagerEventListener(this)
        }
    }
    return observedUIManager
  }
}
