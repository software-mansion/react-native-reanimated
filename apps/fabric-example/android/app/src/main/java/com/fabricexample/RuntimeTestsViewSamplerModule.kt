package com.fabricexample

import android.animation.Animator
import android.graphics.Matrix
import android.graphics.Rect
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
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.style.BorderRadiusProp
import com.facebook.react.uimanager.style.LogicalEdge
import com.swmansion.reanimated.NativeProxy
import com.swmansion.reanimated.ReanimatedModule

/**
 * Records the drawn value of view properties at each draw of the window, with the uptime of the draw. It reads the
 * view, so it gives the same data for each driver of the property. A property can have more than one value: the
 * geometry reads are in dp.
 */
@ReactModule(name = RuntimeTestsViewSamplerModule.NAME)
class RuntimeTestsViewSamplerModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  companion object {
    const val NAME = "RuntimeTestsViewSampler"
    private const val AFFINE_CELL_COUNT = 6
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

  /**
   * `Animator.isPostNotifyEndListenerEnabled()`, a hidden API: true when the natural end of an animator reports in
   * the next frame. Null when reflection does not reach it.
   */
  @ReactMethod
  fun postsAnimatorEnd(promise: Promise) {
    val enabled =
      runCatching { Animator::class.java.getMethod("isPostNotifyEndListenerEnabled").invoke(null) as Boolean }.getOrNull()
    promise.resolve(enabled)
  }

  /** The next view lookup of a native layout start of the tag finds no view (`NativeProxy`). */
  @ReactMethod
  fun failNextViewLookup(tag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val nativeProxy = nativeProxy()
      if (nativeProxy == null) {
        promise.reject("E_NO_NATIVE_PROXY", "Reanimated has no native proxy.")
        return@runOnUiThread
      }
      nativeProxy.failNextNativeAnimationViewLookup(tag.toInt())
      promise.resolve(null)
    }
  }

  /**
   * The playbacks on the view at the failed lookup, five numbers for each (surface, tag, owner, generation,
   * target); null when the lookup did not fail.
   */
  @ReactMethod
  fun takeViewLookupFailure(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val failure = nativeProxy()?.takeNativeAnimationViewLookupFailure()
      promise.resolve(failure?.let { keys -> Arguments.fromArray(keys.map(Long::toDouble).toDoubleArray()) })
    }
  }

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

  private fun nativeProxy(): NativeProxy? =
    reactApplicationContext.getNativeModule(ReanimatedModule::class.java)?.nodesManager?.getNativeProxy()

  private fun rowOf(views: List<View>, properties: List<String>): DoubleArray =
    doubleArrayOf(
      SystemClock.uptimeMillis().toDouble(),
      *views.flatMap { view -> properties.flatMap { valuesOf(view, it) } }.toDoubleArray(),
    )

  private fun valuesOf(view: View, property: String): List<Double> =
    when (property) {
      "opacity" -> listOf(view.alpha.toDouble())
      "backgroundColor" -> listOf(colorValueOf(BackgroundStyleApplicator.getBackgroundColor(view)))
      "borderColor" -> listOf(colorValueOf(BackgroundStyleApplicator.getBorderColor(view, LogicalEdge.ALL)))
      "borderRadius" -> listOf(borderRadiusOf(view))
      "shadowColor" ->
        listOf(
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) colorValueOf(view.outlineAmbientShadowColor) else Double.NaN,
        )
      "frame" -> listOf(view.left, view.top, view.width, view.height).map { dpOf(it.toFloat()) }
      "translation" -> listOf(dpOf(view.translationX), dpOf(view.translationY))
      "animationMatrix" -> animationMatrixOf(view)?.let(::affineCellsOf) ?: List(AFFINE_CELL_COUNT) { Double.NaN }
      "drawnMatrix" -> affineCellsOf(drawnMatrixOf(view))
      "hitRect" -> Rect().also(view::getHitRect).let(::dpOfRect)
      "accessibilityBounds" -> accessibilityBoundsOf(view)
      else -> listOf(Double.NaN)
    }

  private fun dpOf(px: Float): Double = (px / PixelUtil.getDisplayMetricDensity()).toDouble()

  private fun dpOfRect(rect: Rect): List<Double> =
    listOf(rect.left, rect.top, rect.right, rect.bottom).map { dpOf(it.toFloat()) }

  private fun animationMatrixOf(view: View): Matrix? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) view.animationMatrix else null

  /** `animationMatrix ∘ matrix`: the map from the view to its place in the parent, without the frame origin. */
  private fun drawnMatrixOf(view: View): Matrix =
    Matrix(view.matrix).apply { animationMatrixOf(view)?.let(::postConcat) }

  /**
   * The cells 0, 1, 4, 5, 12, and 13 of `facebook::react::Transform` (row vectors): scale x, skew y, skew x,
   * scale y, and the translation in dp.
   */
  private fun affineCellsOf(matrix: Matrix): List<Double> {
    val cells = FloatArray(9).also(matrix::getValues)
    return listOf(
      cells[Matrix.MSCALE_X].toDouble(),
      cells[Matrix.MSKEW_Y].toDouble(),
      cells[Matrix.MSKEW_X].toDouble(),
      cells[Matrix.MSCALE_Y].toDouble(),
      dpOf(cells[Matrix.MTRANS_X]),
      dpOf(cells[Matrix.MTRANS_Y]),
    )
  }

  private fun accessibilityBoundsOf(view: View): List<Double> {
    val node = view.createAccessibilityNodeInfo()
    val bounds = Rect().also(node::getBoundsInScreen)
    @Suppress("DEPRECATION")
    node.recycle()
    return dpOfRect(bounds)
  }

  /** The ARGB int as an unsigned number. No color is NaN. */
  private fun colorValueOf(color: Int?): Double = color?.let { (it.toLong() and 0xFFFFFFFFL).toDouble() } ?: Double.NaN

  private fun borderRadiusOf(view: View): Double {
    val radius = BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_RADIUS) ?: return 0.0
    return if (radius.type == LengthPercentageType.POINT) radius.resolve(0f).toDouble() else Double.NaN
  }
}
