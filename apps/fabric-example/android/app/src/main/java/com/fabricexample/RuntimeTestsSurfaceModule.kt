package com.fabricexample

import android.content.Intent
import android.os.SystemClock
import android.view.Gravity
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableArray
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.interfaces.fabric.ReactSurface
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
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

  /** Uptime, child count, and alpha and id of the first child at each draw of a root view. */
  private class DrawRecord(private val rootView: ViewGroup) {
    private val draws = mutableListOf<DoubleArray>()
    private val listener = ViewTreeObserver.OnDrawListener {
      val firstChild = if (rootView.childCount > 0) rootView.getChildAt(0) else null
      draws.add(
        doubleArrayOf(
          SystemClock.uptimeMillis().toDouble(),
          rootView.childCount.toDouble(),
          firstChild?.alpha?.toDouble() ?: Double.NaN,
          firstChild?.id?.toDouble() ?: Double.NaN,
        ),
      )
    }

    init {
      rootView.viewTreeObserver.addOnDrawListener(listener)
    }

    fun stop(): WritableArray {
      rootView.viewTreeObserver.removeOnDrawListener(listener)
      return Arguments.createArray().apply { draws.forEach { pushArray(Arguments.fromArray(it)) } }
    }
  }

  /**
   * The root view that the next dispatch attaches in its `willMountItems`, and what the module sees of it. The
   * listener of the module runs after the listener of Reanimated, so its `didMountItems` comes after the layout
   * mount report of the dispatch.
   */
  private class DispatchAttach(val shim: RuntimeTestsFabricShim, val rootView: FrameLayout, val promise: Promise) {
    var hasAttached = false
    var queuedPullItemsAtAttach = -1
    var childCountAtReport = -1
    val drawRecord = DrawRecord(rootView)
  }

  private val surfaces = mutableMapOf<Int, ReactSurface>()
  private val pendingStarts = mutableMapOf<ReactSurface, Promise>()
  private val prerenderedSurfaces = mutableMapOf<Int, ReactSurface>()
  private val detachedSurfaces = mutableMapOf<Int, RuntimeTestsFabricShim>()
  private val attachedRootViews = mutableMapOf<Int, FrameLayout>()
  private val prerenderedDraws = mutableMapOf<Int, DrawRecord>()
  private var dispatchAttach: DispatchAttach? = null
  private var observedUIManager: UIManager? = null
  private var isInDispatch = false
  private var dispatchRecord: MutableList<DoubleArray>? = null

  override fun getName() = NAME

  @ReactMethod
  fun start(componentName: String, promise: Promise) {
    UiThreadUtil.runOnUiThread { startOnUiThread(componentName, promise) }
  }

  @ReactMethod
  fun stop(rootTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread { stopOnUiThread(rootTag.toInt(), promise) }
  }

  /** A surface that renders and mounts before its view is in a window. Resolves with its root tag. */
  @ReactMethod
  fun prerender(componentName: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No activity is available.")
        return@runOnUiThread
      }
      val reactHost = checkNotNull((activity.application as ReactApplication).reactHost)
      val surface = reactHost.createSurface(activity, componentName, null)
      val prerendered = surface.prerender()
      thread(name = "RuntimeTestsSurfacePrerender") {
        when {
          !prerendered.waitForCompletion(STOP_TIMEOUT_SECONDS, TimeUnit.SECONDS) ->
            promise.reject("E_NO_PRERENDER", "The surface ${surface.surfaceID} did not prerender in $STOP_TIMEOUT_SECONDS s.")
          prerendered.isFaulted() -> promise.reject("E_PRERENDER_FAILED", prerendered.getError())
          else -> UiThreadUtil.runOnUiThread { registerPrerendered(surface, promise) }
        }
      }
    }
  }

  /** The surface has its root tag from its start (`FabricUIManager.startSurface`), not from its creation. */
  private fun registerPrerendered(surface: ReactSurface, promise: Promise) {
    prerenderedSurfaces[surface.surfaceID] = surface
    promise.resolve(surface.surfaceID)
  }

  /**
   * Puts the view of a prerendered surface in the window, with a draw record from before its first draw, and
   * attaches it: `start` of a running surface attaches its view (`ReactInstance.startSurface`). Resolves at the
   * first mount with content. The surface then stops with `stop`.
   */
  @ReactMethod
  fun attachPrerendered(rootTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      val surface = prerenderedSurfaces.remove(rootTag.toInt())
      if (activity == null || surface == null) {
        promise.reject("E_NO_SURFACE", "No prerendered surface has the root tag $rootTag.")
        return@runOnUiThread
      }
      val rootView = checkNotNull(surface.view)
      prerenderedDraws[surface.surfaceID] = DrawRecord(rootView)
      addToWindow(activity, rootView)
      pendingStarts[surface] = promise
      surface.start()
    }
  }

  /** The draws of the root view of an attached prerendered surface since its attach. Ends the record. */
  @ReactMethod
  fun takePrerenderedDraws(rootTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val record = prerenderedDraws.remove(rootTag.toInt())
      if (record == null) {
        promise.reject("E_NO_RECORD", "No attached prerendered surface has the root tag $rootTag.")
        return@runOnUiThread
      }
      promise.resolve(record.stop())
    }
  }

  /** Starts a record of the uptime at the `willMountItems` and the `didDispatchMountItems` of each dispatch. */
  @ReactMethod
  fun startDispatchRecord(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (observedUIManager() == null) {
        promise.reject("E_NO_UI_MANAGER", "The Fabric UI manager is not available.")
        return@runOnUiThread
      }
      dispatchRecord = mutableListOf()
      promise.resolve(null)
    }
  }

  /** The dispatches since `startDispatchRecord`, each as its start and end uptime. Ends the record. */
  @ReactMethod
  fun takeDispatchRecord(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val record = dispatchRecord.orEmpty()
      dispatchRecord = null
      promise.resolve(Arguments.createArray().apply { record.forEach { pushArray(Arguments.fromArray(it)) } })
    }
  }

  /**
   * A surface that starts with no root view: its mount items wait in the attach queue. Resolves with its root
   * tag.
   */
  @ReactMethod
  fun startWithoutRootView(componentName: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val uiManager = observedUIManager() as FabricUIManager?
      if (uiManager == null) {
        promise.reject("E_NO_UI_MANAGER", "The Fabric UI manager is not available.")
        return@runOnUiThread
      }
      val shim =
        RuntimeTestsFabricShim.startWithoutRootView(
          uiManager,
          reactApplicationContext,
          componentName,
          SURFACE_SIZE_DP.dpToPx().toInt(),
          PixelUtil.getDisplayMetricDensity(),
        )
      detachedSurfaces[shim.surfaceId()] = shim
      promise.resolve(shim.surfaceId())
    }
  }

  /** The number of pull mount items that wait for the root view of the surface. */
  @ReactMethod
  fun queuedPullItems(rootTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val shim = detachedSurfaces[rootTag.toInt()]
      if (shim == null) {
        promise.reject("E_NO_SURFACE", "No surface with no root view has the root tag $rootTag.")
        return@runOnUiThread
      }
      promise.resolve(shim.queuedPullItemCount())
    }
  }

  /**
   * The next dispatch attaches a root view to the surface in its `willMountItems`. Resolves after that dispatch
   * with `queuedPullItemsAtAttach`, `childCountAtReport` (the root view after the layout mount report of the
   * dispatch), `childCountAfterDispatch`, and `draws` (uptime, child count, and alpha of the first child at each
   * draw of the root view).
   */
  @ReactMethod
  fun attachInNextDispatch(rootTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      val shim = detachedSurfaces[rootTag.toInt()]
      if (activity == null || shim == null) {
        promise.reject("E_NO_SURFACE", "No surface with no root view has the root tag $rootTag.")
        return@runOnUiThread
      }
      val rootView = FrameLayout(activity).apply { id = shim.surfaceId() }
      addToWindow(activity, rootView)
      attachedRootViews[shim.surfaceId()] = rootView
      dispatchAttach = DispatchAttach(shim, rootView, promise)
    }
  }

  /**
   * Attaches a root view to the surface from a posted UI-thread task, so that the queued pull items mount in the
   * attach and in no dispatch. Resolves with `queuedPullItemsAtAttach`, `isInDispatchAtAttach`, and
   * `childCountAfterAttach`.
   */
  @ReactMethod
  fun attachOutsideDispatch(rootTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      val shim = detachedSurfaces[rootTag.toInt()]
      if (activity == null || shim == null) {
        promise.reject("E_NO_SURFACE", "No surface with no root view has the root tag $rootTag.")
        return@runOnUiThread
      }
      val rootView = FrameLayout(activity).apply { id = shim.surfaceId() }
      addToWindow(activity, rootView)
      attachedRootViews[shim.surfaceId()] = rootView
      val queuedPullItemsAtAttach = shim.queuedPullItemCount()
      val isInDispatchAtAttach = isInDispatch
      shim.attachRootView(rootView)
      promise.resolve(
        Arguments.createMap().apply {
          putInt("queuedPullItemsAtAttach", queuedPullItemsAtAttach)
          putBoolean("isInDispatchAtAttach", isInDispatchAtAttach)
          putInt("childCountAfterAttach", rootView.childCount)
        },
      )
    }
  }

  /**
   * The pause and the first resume after it. A listener that is added in the resumed state gets a resume at once
   * (`ReactContext.addLifecycleEventListener`), so a resume with no pause before it does not count. The JS timers
   * stop in a pause (`JavaTimerManager.onHostPause`), so the deadline is a message of the main looper, which runs
   * in a pause.
   */
  private inner class PauseRecord(private val promise: Promise) : LifecycleEventListener {
    private var pausedAtMs = Double.NaN
    private var isResolved = false

    override fun onHostResume() {
      if (!pausedAtMs.isNaN()) resolve("resumed", SystemClock.uptimeMillis().toDouble())
    }

    override fun onHostPause() {
      if (pausedAtMs.isNaN()) pausedAtMs = SystemClock.uptimeMillis().toDouble()
    }

    override fun onHostDestroy() = Unit

    fun timeOut() = resolve("timeout", Double.NaN)

    private fun resolve(outcome: String, resumedAtMs: Double) {
      if (isResolved) return
      isResolved = true
      reactApplicationContext.removeLifecycleEventListener(this)
      promise.resolve(
        Arguments.createMap().apply {
          putString("outcome", outcome)
          putDouble("pausedAtMs", pausedAtMs)
          putDouble("resumedAtMs", resumedAtMs)
        },
      )
    }
  }

  /**
   * Covers the main activity with [RuntimeTestsCoverActivity] for `durationMs`: the main activity pauses and stops,
   * then resumes. Resolves at the first resume after a pause with the outcome `resumed`, or with the outcome `timeout`
   * when `timeoutMs` after `durationMs` has no such resume. A task that goes to the back does not come to the front
   * again on its own: Android 10 and later refuse an activity start from the background (measured on API 36: the
   * launcher stays the resumed activity).
   */
  @ReactMethod
  fun runCovered(durationMs: Double, timeoutMs: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No activity is available.")
        return@runOnUiThread
      }
      val record = PauseRecord(promise)
      reactApplicationContext.addLifecycleEventListener(record)
      activity.startActivity(
        Intent(activity, RuntimeTestsCoverActivity::class.java)
          .putExtra(RuntimeTestsCoverActivity.DURATION_MS, durationMs.toLong()),
      )
      UiThreadUtil.runOnUiThread(record::timeOut, (durationMs + timeoutMs).toLong())
    }
  }

  /** Stops a surface that started with no root view, by its own `FabricUIManager.stopSurface`. */
  @ReactMethod
  fun stopWithoutRootView(rootTag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val shim = detachedSurfaces.remove(rootTag.toInt())
      if (shim == null) {
        promise.reject("E_NO_SURFACE", "No surface with no root view has the root tag $rootTag.")
        return@runOnUiThread
      }
      shim.stop()
      attachedRootViews.remove(shim.surfaceId())?.let { view -> (view.parent as ViewGroup?)?.removeView(view) }
      promise.resolve(null)
    }
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
    addToWindow(activity, checkNotNull(surface.view))

    pendingStarts[surface] = promise
    surface.start()
  }

  private fun addToWindow(activity: android.app.Activity, view: ViewGroup) {
    val size = SURFACE_SIZE_DP.dpToPx().toInt()
    activity
      .findViewById<ViewGroup>(android.R.id.content)
      .addView(view, FrameLayout.LayoutParams(size, size, Gravity.BOTTOM or Gravity.START))
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

  override fun willMountItems(uiManager: UIManager) {
    isInDispatch = true
    dispatchRecord?.add(doubleArrayOf(SystemClock.uptimeMillis().toDouble(), Double.NaN))
    val attach = dispatchAttach ?: return
    if (attach.hasAttached) return
    attach.queuedPullItemsAtAttach = attach.shim.queuedPullItemCount()
    attach.shim.attachRootView(attach.rootView)
    attach.hasAttached = true
  }

  override fun didMountItems(uiManager: UIManager) {
    dispatchAttach?.takeIf { it.hasAttached && it.childCountAtReport < 0 }?.let {
      it.childCountAtReport = it.rootView.childCount
    }
    pendingStarts.entries.removeAll { (surface, promise) ->
      val hasMountedContent = (surface.view?.childCount ?: 0) > 0
      if (hasMountedContent) {
        surfaces[surface.surfaceID] = surface
        promise.resolve(surface.surfaceID)
      }
      hasMountedContent
    }
  }

  override fun didDispatchMountItems(uiManager: UIManager) {
    isInDispatch = false
    dispatchRecord?.lastOrNull()?.takeIf { it[1].isNaN() }?.set(1, SystemClock.uptimeMillis().toDouble())
    val attach = dispatchAttach?.takeIf { it.hasAttached } ?: return
    dispatchAttach = null
    val childCountAfterDispatch = attach.rootView.childCount
    attach.rootView.post {
      attach.promise.resolve(
        Arguments.createMap().apply {
          putInt("queuedPullItemsAtAttach", attach.queuedPullItemsAtAttach)
          putInt("childCountAtReport", attach.childCountAtReport)
          putInt("childCountAfterDispatch", childCountAfterDispatch)
          putArray("draws", attach.drawRecord.stop())
        },
      )
    }
  }

  override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

  override fun didScheduleMountItems(uiManager: UIManager) = Unit

  override fun invalidate() {
    UiThreadUtil.runOnUiThread {
      observedUIManager?.removeUIManagerEventListener(this)
      observedUIManager = null
      (surfaces.values + pendingStarts.keys + prerenderedSurfaces.values).forEach { surface ->
        surface.stop()
        surface.view?.let { view -> (view.parent as ViewGroup?)?.removeView(view) }
      }
      detachedSurfaces.values.forEach(RuntimeTestsFabricShim::stop)
      attachedRootViews.values.forEach { view -> (view.parent as ViewGroup?)?.removeView(view) }
      attachedRootViews.clear()
      prerenderedDraws.values.forEach { it.stop() }
      prerenderedDraws.clear()
      dispatchRecord = null
      surfaces.clear()
      pendingStarts.clear()
      prerenderedSurfaces.clear()
      detachedSurfaces.clear()
      dispatchAttach = null
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
