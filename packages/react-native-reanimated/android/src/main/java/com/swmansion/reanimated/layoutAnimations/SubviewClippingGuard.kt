package com.swmansion.reanimated.layoutAnimations

import android.view.View
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.ReactClippingViewGroupHelper

/**
 * Excludes views with an active layout animation from subview clipping, so a parent
 * with `removeClippedSubviews` keeps them attached until the animation ends.
 */
internal class SubviewClippingGuard(
    private val fabricUIManager: FabricUIManager,
) {
    private val lock = Any()
    private var invalidated = false

    /** Per surface: tags of the views with an active or pending layout animation. */
    private val excludedTagsBySurface = HashMap<Int, IntArray>()

    /** Views that currently carry the exclusion flag. UI thread only. */
    private val excludedViews = HashMap<Int, View>()

    @OptIn(UnstableReactNativeAPI::class)
    private val mountListener =
        object : UIManagerListener {
            override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

            override fun willMountItems(uiManager: UIManager) = applyExclusions()

            override fun didMountItems(uiManager: UIManager) = Unit

            override fun didDispatchMountItems(uiManager: UIManager) = Unit

            override fun didScheduleMountItems(uiManager: UIManager) = Unit
        }

    init {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.addUIManagerEventListener(mountListener)
    }

    /** Called on the JS or the UI thread. */
    fun updateClippingExclusions(
        surfaceId: Int,
        tags: IntArray,
    ) {
        synchronized(lock) {
            if (invalidated) return
            if (tags.isEmpty()) excludedTagsBySurface.remove(surfaceId) else excludedTagsBySurface[surfaceId] = tags
        }
    }

    fun invalidate() {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.removeUIManagerEventListener(mountListener)
        synchronized(lock) {
            invalidated = true
            excludedTagsBySurface.clear()
        }
    }

    private fun applyExclusions() {
        val excludedTags = synchronized(lock) { excludedTagsBySurface.values.flatMap { it.asIterable() }.toHashSet() }
        if (excludedTags.isEmpty() && excludedViews.isEmpty()) return
        val stale = excludedViews.entries.iterator()
        while (stale.hasNext()) {
            val (tag, view) = stale.next()
            if (tag in excludedTags) continue
            ReactClippingViewGroupHelper.setExcludedFromClipping(view, false)
            stale.remove()
        }
        for (tag in excludedTags) {
            if (tag in excludedViews) continue
            val view = viewForTag(tag) ?: continue
            ReactClippingViewGroupHelper.setExcludedFromClipping(view, true)
            excludedViews[tag] = view
        }
    }

    private fun viewForTag(tag: Int): View? =
        try {
            fabricUIManager.resolveView(tag)
        } catch (e: IllegalViewOperationException) {
            null
        }
}
