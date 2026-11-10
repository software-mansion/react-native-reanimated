package com.fabricexample

import android.annotation.SuppressLint
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableArray
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.views.textinput.ReactEditText
import java.util.Locale
import kotlin.math.cos
import kotlin.math.sin

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
      val origin = untransformedOriginOnScreen(view)
      val observation = Arguments.createMap()
      observation.putDouble("x", PixelUtil.toDIPFromPixel(origin[0]).toDouble())
      observation.putDouble("y", PixelUtil.toDIPFromPixel(origin[1]).toDouble())
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
      observation.putArray("matrix", affineMatrix(view))
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

  // The transforms of the ancestors apply to the origin, and the transform of the view does not.
  private fun untransformedOriginOnScreen(view: View): FloatArray {
    val point = floatArrayOf(view.left.toFloat(), view.top.toFloat())
    var parent = view.parent as? View
    while (parent != null) {
      point[0] -= parent.scrollX
      point[1] -= parent.scrollY
      parent.matrix.mapPoints(point)
      point[0] += parent.left
      point[1] += parent.top
      parent = parent.parent as? View
    }
    val window = IntArray(2)
    view.rootView.getLocationOnScreen(window)
    return floatArrayOf(point[0] + window[0], point[1] + window[1])
  }

  // React Native splits a 2D transform into these view properties, so they give the 4x4 matrix of React Native back.
  private fun affineMatrix(view: View): WritableArray {
    val rotation = Math.toRadians(view.rotation.toDouble())
    val cos = cos(rotation)
    val sin = sin(rotation)
    val cells = doubleArrayOf(
      view.scaleX * cos, view.scaleX * sin, 0.0, 0.0,
      -view.scaleY * sin, view.scaleY * cos, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      PixelUtil.toDIPFromPixel(view.translationX).toDouble(), PixelUtil.toDIPFromPixel(view.translationY).toDouble(), 0.0, 1.0,
    )
    return Arguments.createArray().apply { cells.forEach { pushDouble(it) } }
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
