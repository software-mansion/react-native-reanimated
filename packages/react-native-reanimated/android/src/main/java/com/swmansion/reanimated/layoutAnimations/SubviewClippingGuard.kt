package com.swmansion.reanimated.layoutAnimations

import android.view.View
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.ReactClippingViewGroup

/**
 * Keeps views with an active layout animation attached to a parent that has
 * `removeClippedSubviews`, until the animation ends and the final layout mounts.
 */
internal class SubviewClippingGuard(
    private val fabricUIManager: FabricUIManager,
) {
    private val lock = Any()
    private var invalidated = false

    /** Per surface: flat `[tag, parentTag, ...]` pairs of the animated views. */
    private val tagPairsBySurface = HashMap<Int, IntArray>()

    @OptIn(UnstableReactNativeAPI::class)
    private val mountListener =
        object : UIManagerListener {
            override fun willDispatchViewUpdates(uiManager: UIManager) = Unit

            override fun willMountItems(uiManager: UIManager) = Unit

            override fun didMountItems(uiManager: UIManager) = restoreClippedChildren()

            override fun didDispatchMountItems(uiManager: UIManager) = Unit

            override fun didScheduleMountItems(uiManager: UIManager) = Unit
        }

    init {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.addUIManagerEventListener(mountListener)
    }

    /** Called on the JS or the UI thread. */
    fun updateClippingProtection(
        surfaceId: Int,
        tagPairs: IntArray,
    ) {
        synchronized(lock) {
            if (invalidated) return
            if (tagPairs.isEmpty()) tagPairsBySurface.remove(surfaceId) else tagPairsBySurface[surfaceId] = tagPairs
        }
    }

    fun invalidate() {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.removeUIManagerEventListener(mountListener)
        synchronized(lock) {
            invalidated = true
            tagPairsBySurface.clear()
        }
    }

    private fun restoreClippedChildren() {
        val surfaces = synchronized(lock) { tagPairsBySurface.values.toList() }
        if (surfaces.isEmpty()) return
        val protectedTags = HashSet<Int>()
        val childrenByParent = HashMap<Int, MutableList<Int>>()
        for (tagPairs in surfaces) {
            for (i in tagPairs.indices step 2) {
                protectedTags.add(tagPairs[i])
                childrenByParent.getOrPut(tagPairs[i + 1]) { ArrayList() }.add(tagPairs[i])
            }
        }
        for ((parentTag, children) in childrenByParent) {
            val parent = viewForTag(parentTag) as? ReactClippingViewGroup ?: continue
            if (!parent.removeClippedSubviews) continue
            if (children.none { isDetached(it) }) continue
            parent.updateClippingRect(protectedTags)
        }
    }

    private fun isDetached(tag: Int): Boolean = viewForTag(tag)?.let { it.parent == null } ?: false

    private fun viewForTag(tag: Int): View? =
        try {
            fabricUIManager.resolveView(tag)
        } catch (e: IllegalViewOperationException) {
            null
        }
}
