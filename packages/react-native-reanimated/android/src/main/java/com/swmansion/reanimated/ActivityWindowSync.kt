package com.swmansion.reanimated

import android.app.Activity
import android.os.Build
import android.view.AttachedSurfaceControl
import android.view.View
import android.view.WindowManager
import android.view.inspector.WindowInspector
import android.window.SurfaceSyncGroup
import androidx.annotation.RequiresApi

// The windows of an activity show their frames independently. When a carrier moves between the overlay window and
// another window, the frames of all windows of the activity from that mount apply in one transaction, so that the
// carrier does not go missing between two windows. A window that the platform adds in the mount joins the group through
// the window manager. A window that the mount removes, at once or after its current traversal, cannot join, so then the
// windows show their frames independently.
class ActivityWindowSync {
    private var windowsBeforeMount: List<View>? = null

    fun willMount() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            windowsBeforeMount = WindowInspector.getGlobalWindowViews()
        }
    }

    fun didMount(activities: List<Activity>) {
        val windowsBefore = windowsBeforeMount ?: return
        windowsBeforeMount = null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            activities.forEach { syncWindowsOf(it, windowsBefore) }
        }
    }

    @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private fun syncWindowsOf(
        activity: Activity,
        windowsBefore: List<View>,
    ) {
        val token = activity.window.attributes.token ?: return
        val windows = WindowInspector.getGlobalWindowViews().filter { tokenOf(it) === token && it.parent != null }
        if (windowsBefore.any { tokenOf(it) === token && it !in windows }) {
            return
        }
        val group = SurfaceSyncGroup("SharedTransitionOverlay")
        windows.mapNotNull { it.parent as? AttachedSurfaceControl }.forEach { group.add(it, null) }
        group.markSyncReady()
    }

    private fun tokenOf(window: View) = (window.layoutParams as? WindowManager.LayoutParams)?.token
}
