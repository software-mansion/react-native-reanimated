package com.fabricexample

import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.BackgroundStyleApplicator
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.LengthPercentageType
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.style.BorderRadiusProp
import com.facebook.react.uimanager.style.LogicalEdge

/**
 * Records the drawn value of view properties at each draw of the window, with the uptime of the draw. It reads the
 * view, so it gives the same data for each driver of the property.
 */
@ReactModule(name = RuntimeTestsViewSamplerModule.NAME)
class RuntimeTestsViewSamplerModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  companion object {
    const val NAME = "RuntimeTestsViewSampler"
  }

  private class Recording(
    val observer: ViewTreeObserver,
    val listener: ViewTreeObserver.OnDrawListener,
    val rows: MutableList<DoubleArray>,
  )

  private var recording: Recording? = null

  override fun getName() = NAME

  /** Starts a recording of `properties` of the views of `tags`, which are in one window. One recording at a time. */
  @ReactMethod
  fun start(tags: ReadableArray, properties: ReadableArray, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val views = (0 until tags.size()).map { viewOf(tags.getInt(it)) }
      if (views.isEmpty() || views.any { it == null }) {
        promise.reject("E_NO_VIEW", "A tag of $tags has no view.")
        return@runOnUiThread
      }
      recording?.let(::detach)
      val names = (0 until properties.size()).map { properties.getString(it)!! }
      val rows = mutableListOf<DoubleArray>()
      val listener = ViewTreeObserver.OnDrawListener { rows.add(rowOf(views.filterNotNull(), names)) }
      val observer = views.first()!!.viewTreeObserver
      observer.addOnDrawListener(listener)
      recording = Recording(observer, listener, rows)
      promise.resolve(null)
    }
  }

  /** Ends the recording. Each row is the uptime of the draw in ms, then the value of each property of each view. */
  @ReactMethod
  fun stop(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val ended = recording
      if (ended == null) {
        promise.reject("E_NOT_RECORDING", "No recording runs.")
        return@runOnUiThread
      }
      detach(ended)
      val rows = Arguments.createArray()
      ended.rows.forEach { row -> rows.pushArray(Arguments.fromArray(row)) }
      promise.resolve(rows)
    }
  }

  /** The uptime in ms, the clock of the rows and of the Reanimated animation clock with no slow animations. */
  @ReactMethod
  fun now(promise: Promise) = promise.resolve(SystemClock.uptimeMillis().toDouble())

  @ReactMethod
  fun animatorDurationScale(promise: Promise) =
    promise.resolve(
      Settings.Global.getFloat(
          reactApplicationContext.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        .toDouble())

  @ReactMethod
  fun apiLevel(promise: Promise) = promise.resolve(Build.VERSION.SDK_INT)

  override fun invalidate() {
    UiThreadUtil.runOnUiThread { recording?.let(::detach) }
    super.invalidate()
  }

  private fun detach(ended: Recording) {
    if (ended.observer.isAlive) {
      ended.observer.removeOnDrawListener(ended.listener)
    }
    if (recording === ended) {
      recording = null
    }
  }

  private fun viewOf(tag: Int): View? {
    val uiManager =
      UIManagerHelper.getUIManager(reactApplicationContext, UIManagerType.FABRIC) as FabricUIManager? ?: return null
    return try {
      uiManager.resolveView(tag)
    } catch (e: IllegalViewOperationException) {
      null
    }
  }

  private fun rowOf(views: List<View>, properties: List<String>): DoubleArray =
    doubleArrayOf(
      SystemClock.uptimeMillis().toDouble(),
      *views.flatMap { view -> properties.map { valueOf(view, it) } }.toDoubleArray(),
    )

  private fun valueOf(view: View, property: String): Double =
    when (property) {
      "opacity" -> view.alpha.toDouble()
      "backgroundColor" -> colorValueOf(BackgroundStyleApplicator.getBackgroundColor(view))
      "borderColor" -> colorValueOf(BackgroundStyleApplicator.getBorderColor(view, LogicalEdge.ALL))
      "borderRadius" -> borderRadiusOf(view)
      "shadowColor" ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) colorValueOf(view.outlineAmbientShadowColor) else Double.NaN
      else -> Double.NaN
    }

  /** The ARGB int as an unsigned number. No color is NaN. */
  private fun colorValueOf(color: Int?): Double = color?.let { (it.toLong() and 0xFFFFFFFFL).toDouble() } ?: Double.NaN

  private fun borderRadiusOf(view: View): Double {
    val radius = BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_RADIUS) ?: return 0.0
    return if (radius.type == LengthPercentageType.POINT) radius.resolve(0f).toDouble() else Double.NaN
  }
}
