package com.swmansion.reanimated.layoutAnimations

import android.view.View
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.ReactClippingViewGroup

/**
 * A parent with `removeClippedSubviews` detaches a child that lies outside its bounds. A layout
 * animation moves the child over many frames, so the child can leave the bounds before it
 * arrives at its target. This class attaches such children again after each mount, until the
 * animation ends and React Native clips them with their final layout.
 */
internal class SubviewClippingGuard(
    private val fabricUIManager: FabricUIManager,
) {
    private val lock = Any()
    private var animatedChildrenByParent = HashMap<Int, MutableSet<Int>>()

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

    /** Called from the pull that emits the transaction, on the JS or the UI thread. */
    fun protect(
        viewTags: IntArray,
        parentTags: IntArray,
    ) {
        synchronized(lock) {
            for (i in viewTags.indices) {
                animatedChildrenByParent.getOrPut(parentTags[i]) { HashSet() }.add(viewTags[i])
            }
        }
    }

    fun invalidate() {
        @OptIn(UnstableReactNativeAPI::class)
        fabricUIManager.removeUIManagerEventListener(mountListener)
        synchronized(lock) { animatedChildrenByParent.clear() }
    }

    private fun restoreClippedChildren() {
        val byParent =
            synchronized(lock) {
                if (animatedChildrenByParent.isEmpty()) return
                animatedChildrenByParent.also { animatedChildrenByParent = HashMap() }
            }
        for ((parentTag, childTags) in byParent) {
            val parent = viewForTag(parentTag) as? ReactClippingViewGroup ?: continue
            if (!parent.removeClippedSubviews) continue
            if (childTags.none { isDetached(it) }) continue
            parent.updateClippingRect(childTags)
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
