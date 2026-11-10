package com.swmansion.reanimated

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.ContextWrapper
import android.graphics.PixelFormat
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.children
import com.facebook.react.R
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import java.lang.ref.WeakReference
import java.util.concurrent.ConcurrentHashMap

// A carrier that moves between two layout roots, such as the screen and a Modal, must show above the windows of
// both. The overlay is a view that Fabric creates and never inserts. It goes into its own application window of the
// activity that shows the surface, and it stays there until the surface stops, as on iOS. A window that is added
// later is above it. When a carrier flies into or out of such a Modal, the overlay gets a new native ID in a mount, and
// the overlay window is added again after that mount.
class SharedTransitionOverlays(
    private val uiManager: FabricUIManager,
    private val context: WeakReference<ReactApplicationContext>,
) {
    private val overlayTags = ConcurrentHashMap<Int, Int>()
    private val shownOverlays = HashMap<Int, ShownOverlay>()
    private val windowSync = ActivityWindowSync()

    @Volatile
    private var resumedActivity: WeakReference<Activity>? = null

    private class ShownOverlay(
        val view: View,
        val activity: Activity,
        val params: WindowManager.LayoutParams,
        val nativeId: Any?,
        var carrierTags: List<Int>,
        var rootWidth: Int,
        var rootHeight: Int,
    )

    private val activityCallbacks =
        object : Application.ActivityLifecycleCallbacks {
            override fun onActivityDestroyed(activity: Activity) {
                if (resumedActivity?.get() === activity) {
                    resumedActivity = null
                }
                shownOverlays.filterValues { it.activity === activity }.keys.forEach(::hide)
            }

            override fun onActivityCreated(
                activity: Activity,
                savedInstanceState: Bundle?,
            ) = Unit

            override fun onActivityStarted(activity: Activity) = Unit

            override fun onActivityResumed(activity: Activity) {
                resumedActivity = WeakReference(activity)
            }

            override fun onActivityPaused(activity: Activity) {
                if (activity.isFinishing && resumedActivity?.get() === activity) {
                    resumedActivity = null
                }
            }

            override fun onActivityStopped(activity: Activity) = Unit

            override fun onActivitySaveInstanceState(
                activity: Activity,
                outState: Bundle,
            ) = Unit
        }

    init {
        (context.get()?.applicationContext as? Application)?.registerActivityLifecycleCallbacks(activityCallbacks)
        UiThreadUtil.runOnUiThread {
            if (resumedActivity == null) {
                resumedActivity =
                    context
                        .get()
                        ?.currentActivity
                        ?.takeUnless { it.isFinishing }
                        ?.let(::WeakReference)
            }
        }
    }

    fun setOverlay(
        surfaceId: Int,
        tag: Int?,
    ) {
        if (tag == null) {
            overlayTags.remove(surfaceId)
            UiThreadUtil.runOnUiThread { hide(surfaceId) }
            return
        }
        overlayTags[surfaceId] = tag
    }

    fun canShow(): Boolean = overlayActivity() != null

    // Only a mount that moves a carrier into a host, or a mount while the overlay holds carriers, can sync windows.
    fun willMountItems(movesCarriers: Boolean) {
        if (movesCarriers || shownOverlays.values.any { it.carrierTags.isNotEmpty() }) {
            windowSync.willMount()
        }
    }

    fun didMountItems() {
        UiThreadUtil.assertOnUiThread()
        val activitiesWithMovedCarriers = overlayTags.entries.mapNotNull { (surfaceId, tag) -> update(surfaceId, tag) }
        windowSync.didMount(activitiesWithMovedCarriers.distinct())
    }

    fun invalidate() {
        overlayTags.clear()
        (context.get()?.applicationContext as? Application)?.unregisterActivityLifecycleCallbacks(activityCallbacks)
        UiThreadUtil.runOnUiThread { shownOverlays.keys.toList().forEach(::hide) }
    }

    // Returns the activity of the overlay when a carrier moves into or out of the overlay window in this mount, or when
    // the window is added.
    private fun update(
        surfaceId: Int,
        overlayTag: Int,
    ): Activity? {
        val rootView = resolveView(surfaceId)
        if (rootView == null) {
            overlayTags.remove(surfaceId, overlayTag)
            hide(surfaceId)
            return null
        }
        val overlay = resolveView(overlayTag) as? ViewGroup
        val shown = shownOverlays[surfaceId]
        if (overlay == null || shown == null || shown.view !== overlay || shown.nativeId != nativeIdOf(overlay)) {
            hide(surfaceId)
            return overlay?.let { show(surfaceId, it, rootView) }
        }
        val rootResized = shown.rootWidth != rootView.width || shown.rootHeight != rootView.height
        if (overlay.childCount == 0 && shown.carrierTags.isEmpty() && !rootResized) {
            return null
        }
        shown.rootWidth = rootView.width
        shown.rootHeight = rootView.height
        followRootView(shown, rootView)
        val carrierTags = carrierTagsOf(overlay)
        val movesCarrier = carrierTags != shown.carrierTags
        shown.carrierTags = carrierTags
        return shown.activity.takeIf { movesCarrier }
    }

    private fun show(
        surfaceId: Int,
        overlay: ViewGroup,
        rootView: View,
    ): Activity? {
        if (overlay.childCount == 0) {
            return null
        }
        val activity = overlayActivity()?.takeIf { it === activityOf(rootView.context) } ?: return null
        val params =
            WindowManager.LayoutParams(
                WindowManager.LayoutParams.TYPE_APPLICATION,
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT,
            )
        params.gravity = Gravity.TOP or Gravity.LEFT
        params.windowAnimations = 0
        params.title = "SharedTransitionOverlay"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            params.fitInsetsTypes = 0
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        setBounds(params, overlay, rootView, activity)
        try {
            activity.windowManager.addView(overlay, params)
        } catch (e: WindowManager.BadTokenException) {
            Log.w("Reanimated", "Cannot show the shared transition overlay", e)
            return null
        } catch (e: IllegalStateException) {
            Log.w("Reanimated", "Cannot show the shared transition overlay", e)
            return null
        }
        shownOverlays[surfaceId] =
            ShownOverlay(
                overlay,
                activity,
                params,
                nativeIdOf(overlay),
                carrierTagsOf(overlay),
                rootView.width,
                rootView.height,
            )
        return activity
    }

    // The commit thread asks if a run between two windows can start, so `resumedActivity` is volatile. The window uses
    // the same activity, and only when it shows the surface.
    private fun overlayActivity(): Activity? = resumedActivity?.get()?.takeUnless { it.isFinishing || it.isDestroyed }

    private fun carrierTagsOf(overlay: ViewGroup) = overlay.children.map { it.id }.toList()

    private fun nativeIdOf(overlay: View): Any? = overlay.getTag(R.id.view_tag_native_id)

    private fun followRootView(
        shown: ShownOverlay,
        rootView: View,
    ) {
        val params = shown.params
        val previous = intArrayOf(params.x, params.y, params.width, params.height)
        setBounds(params, shown.view, rootView, shown.activity)
        if (!previous.contentEquals(intArrayOf(params.x, params.y, params.width, params.height))) {
            shown.activity.windowManager.updateViewLayout(shown.view, params)
        }
    }

    // A window over the navigation bar decides its color, so the overlay window is the part of the root view that is
    // not over the bar. The overlay keeps the origin of the root view. The position of the window is relative to the
    // window of the activity, which is not at the origin of the screen in multi-window mode.
    private fun setBounds(
        params: WindowManager.LayoutParams,
        overlay: View,
        rootView: View,
        activity: Activity,
    ) {
        val root = rectOnScreen(rootView)
        val visible = rectOnScreen(rootView.rootView)
        ViewCompat.getRootWindowInsets(rootView)?.getInsets(WindowInsetsCompat.Type.navigationBars())?.let {
            visible.left += it.left
            visible.top += it.top
            visible.right -= it.right
            visible.bottom -= it.bottom
        }
        if (!visible.intersect(root)) {
            visible.set(root.left, root.top, root.left, root.top)
        }
        val activityWindow = rectOnScreen(activity.window.decorView)
        params.x = visible.left - activityWindow.left
        params.y = visible.top - activityWindow.top
        params.width = visible.width()
        params.height = visible.height()
        overlay.translationX = (root.left - visible.left).toFloat()
        overlay.translationY = (root.top - visible.top).toFloat()
    }

    private fun rectOnScreen(view: View): Rect {
        val location = IntArray(2)
        view.getLocationOnScreen(location)
        return Rect(location[0], location[1], location[0] + view.width, location[1] + view.height)
    }

    private fun hide(surfaceId: Int) {
        val shown = shownOverlays.remove(surfaceId) ?: return
        if (shown.view.parent == null) {
            return
        }
        try {
            shown.activity.windowManager.removeViewImmediate(shown.view)
        } catch (_: IllegalArgumentException) {
            // The system removed the window with its activity.
        }
    }

    private fun activityOf(context: Context): Activity? {
        var current: Context? = context
        while (current is ContextWrapper) {
            if (current is Activity) {
                return current
            }
            if (current is ReactContext) {
                return current.currentActivity
            }
            current = current.baseContext
        }
        return null
    }

    private fun resolveView(tag: Int): View? =
        try {
            uiManager.resolveView(tag)
        } catch (_: IllegalViewOperationException) {
            null
        }
}
