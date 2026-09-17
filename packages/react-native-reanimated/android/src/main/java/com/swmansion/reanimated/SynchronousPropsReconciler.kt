package com.swmansion.reanimated

import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.FabricUIManager

/**
 * Restores synchronously written props that a mount overwrote.
 *
 * Under `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` the animated value of a synchronous prop never
 * reaches the ShadowTree, yet `ReanimatedCommitHook` still injects the updates registry into every
 * React commit. That snapshot is taken on the commit thread, so by the time the commit mounts, the
 * value it writes is older than the one already on the View. `performOperations` only applies what
 * was flushed since its last run, so a frame that produced no new update leaves the regressed value
 * on screen until the next one arrives — a continuous animation therefore reads as jitter rather
 * than as a single lost frame.
 *
 * Mounting is the only other writer of these props, and it runs on the UI thread before the frame
 * draws, so replaying the registry from [didMountItems] lands after the clobber and still ahead of
 * the draw.
 */
internal class SynchronousPropsReconciler(
    private val fabricUIManager: FabricUIManager,
    private val replaySynchronousProps: () -> Unit,
) {
    @OptIn(UnstableReactNativeAPI::class)
    private val mountListener =
        object : UIManagerListener {
            override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

            override fun willMountItems(uiManager: UIManager) = Unit

            override fun didMountItems(uiManager: UIManager) = replaySynchronousProps()

            override fun didDispatchMountItems(uiManager: UIManager) = Unit

            override fun didScheduleMountItems(uiManager: UIManager) = Unit
        }

    init {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.addUIManagerEventListener(mountListener)
    }

    fun invalidate() {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.removeUIManagerEventListener(mountListener)
    }
}
