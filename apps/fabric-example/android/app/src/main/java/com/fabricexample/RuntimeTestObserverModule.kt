package com.fabricexample

import android.annotation.SuppressLint
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.views.textinput.ReactEditText
import java.util.Locale

class RuntimeTestObserverModule(context: ReactApplicationContext) : NativeRuntimeTestObserverSpec(context) {
  override fun getName() = NAME

  override fun emitScreenTransitionProgress(
    tag: Double,
    progress: Double,
    closing: Boolean,
    goingForward: Boolean,
    promise: Promise
  ) {
    promise.reject("E_PLATFORM", "Screen progress tests require iOS")
  }

  override fun emitScreenGestureCancel(tag: Double, promise: Promise) {
    promise.reject("E_PLATFORM", "Screen progress tests require iOS")
  }

  override fun observeParent(tag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      promise.resolve((mountedView(tag)?.parent as? View)?.id?.takeIf { it > 0 })
    }
  }

  override fun observeLocationOnScreen(tag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val view = mountedView(tag)
      if (view == null) {
        promise.resolve(null)
        return@runOnUiThread
      }
      val location = IntArray(2)
      view.getLocationOnScreen(location)
      val observation = Arguments.createMap()
      observation.putDouble("x", PixelUtil.toDIPFromPixel((location[0] - view.translationX).toFloat()).toDouble())
      observation.putDouble("y", PixelUtil.toDIPFromPixel((location[1] - view.translationY).toFloat()).toDouble())
      promise.resolve(observation)
    }
  }

  override fun observeTransform(tag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val view = mountedView(tag)
      if (view == null) {
        promise.resolve(null)
        return@runOnUiThread
      }
      val observation = Arguments.createMap()
      observation.putDouble("width", PixelUtil.toDIPFromPixel(view.width.toFloat()).toDouble())
      observation.putDouble("translateX", PixelUtil.toDIPFromPixel(view.translationX).toDouble())
      promise.resolve(observation)
    }
  }

  override fun observeWindowAbove(tag: Double, otherTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val window = mountedView(tag)?.rootView
      val otherWindow = mountedView(otherTag)?.rootView
      val windows = windowsInAddOrder()
      if (window == null || otherWindow == null || windows == null) {
        promise.resolve(null)
        return@runOnUiThread
      }
      promise.resolve(windows.indexOf(window) > windows.indexOf(otherWindow))
    }
  }

  override fun observeTextInput(tag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val view = mountedView(tag)
      if (view !is ReactEditText) {
        promise.resolve(null)
        return@runOnUiThread
      }
      val observation = Arguments.createMap()
      observation.putString("accessibilityLabel", view.contentDescription?.toString())
      val setterCalls = RuntimeTestTextInputManager.labelSetterCalls(view)
      if (setterCalls == null) observation.putNull("labelSetterCalls")
      else observation.putInt("labelSetterCalls", setterCalls)
      observation.putString("placeholderTextColor", String.format(
        Locale.ROOT, "#%06x%02x", view.currentHintTextColor and 0xffffff, view.currentHintTextColor ushr 24
      ))
      promise.resolve(observation)
    }
  }

  override fun startUnmountRecording(promise: Promise) {
    promise.resolve(null)
  }

  override fun takeUnmountRecording(promise: Promise) {
    promise.resolve(null)
  }

  private fun mountedView(tag: Double): View? {
    val view =
      try {
        UIManagerHelper.getUIManager(reactApplicationContext, UIManagerType.FABRIC)?.resolveView(tag.toInt())
      } catch (_: IllegalViewOperationException) {
        null
      }
    return view?.takeIf { it.isAttachedToWindow }
  }

  // The SDK has no window order, and windows of one type and one activity stack in the order they were added.
  @SuppressLint("PrivateApi", "DiscouragedPrivateApi")
  private fun windowsInAddOrder(): List<View>? =
    try {
      val windowManagerGlobal = Class.forName("android.view.WindowManagerGlobal")
      val instance = windowManagerGlobal.getMethod("getInstance").invoke(null)
      val views = windowManagerGlobal.getDeclaredField("mViews").apply { isAccessible = true }
      (views.get(instance) as List<*>).filterIsInstance<View>()
    } catch (_: ReflectiveOperationException) {
      null
    }

  companion object {
    const val NAME = "RuntimeTestObserver"
  }
}
