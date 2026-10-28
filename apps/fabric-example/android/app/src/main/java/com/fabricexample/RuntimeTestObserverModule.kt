package com.fabricexample

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

  override fun observeTransform(tag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val view = mountedView(tag)
      if (view == null) {
        promise.resolve(null)
        return@runOnUiThread
      }
      val observation = Arguments.createMap()
      observation.putDouble("translateX", PixelUtil.toDIPFromPixel(view.translationX).toDouble())
      promise.resolve(observation)
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
      observation.putString("placeholderTextColor", String.format(
        Locale.ROOT, "#%06x%02x", view.currentHintTextColor and 0xffffff, view.currentHintTextColor ushr 24
      ))
      promise.resolve(observation)
    }
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

  companion object {
    const val NAME = "RuntimeTestObserver"
  }
}
