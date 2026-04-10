package com.swmansion.reanimated.pseudoSelectors

import android.util.Log
import android.view.MotionEvent
import android.view.View
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.swmansion.reanimated.nativeProxy.PseudoSelectorCallback

class PseudoSelectorManager(private val fabricUIManager: FabricUIManager) {
  // Key = "$tag:$selectorInt" — allows multiple selectors per view.
  private val detachActions = HashMap<String, Runnable>()

  fun attach(
    tag: Int,
    selector: Int,
    callback: PseudoSelectorCallback,
  ) {
    UiThreadUtil.runOnUiThread {
      val view = fabricUIManager.resolveView(tag) ?: return@runOnUiThread
      val key = "$tag:$selector"
      when (selector) {
        0 -> { // :active
          val listener =
            View.OnTouchListener { _, event ->
              val action = event.actionMasked
              if (action == MotionEvent.ACTION_DOWN) {
                callback.onSelectorStateChanged(true)
              } else if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
                callback.onSelectorStateChanged(false)
              }
              false
            }
          view.setOnTouchListener(listener)
          detachActions[key] = Runnable { view.setOnTouchListener(null) }
        }
        1 -> { // :focus
          var isFocused = false
          val listener =
            android.view.ViewTreeObserver.OnGlobalFocusChangeListener { _, _ ->
              val hasFocus = view.hasFocus()
              if (hasFocus && !isFocused) {
                isFocused = true
                callback.onSelectorStateChanged(true)
              } else if (!hasFocus && isFocused) {
                isFocused = false
                callback.onSelectorStateChanged(false)
              }
            }
          view.viewTreeObserver.addOnGlobalFocusChangeListener(listener)
          detachActions[key] =
            Runnable { view.viewTreeObserver.removeOnGlobalFocusChangeListener(listener) }
        }
        2 -> { // :hover
          Log.d("PseudoSelector", "Setting hover listener on view tag=$tag")
          val listener =
            View.OnHoverListener { _, event ->
              Log.d("PseudoSelector", "hover event: action=${event.actionMasked}")
              val action = event.actionMasked
              if (action == MotionEvent.ACTION_HOVER_ENTER) {
                callback.onSelectorStateChanged(true)
              } else if (action == MotionEvent.ACTION_HOVER_EXIT) {
                callback.onSelectorStateChanged(false)
              }
              false
            }
          view.setOnHoverListener(listener)
          detachActions[key] = Runnable { view.setOnHoverListener(null) }
        }
      }
    }
  }

  fun detach(
    tag: Int,
    selector: Int,
  ) {
    UiThreadUtil.runOnUiThread { detachActions.remove("$tag:$selector")?.run() }
  }
}
