package com.fabricexample

import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.textinput.ReactTextInputManager
import java.util.WeakHashMap

class RuntimeTestTextInputManager : ReactTextInputManager() {
  @ReactProp(name = "accessibilityLabel")
  override fun setAccessibilityLabel(view: ReactEditText, label: String?) {
    labelSetterCalls[view] = (labelSetterCalls[view] ?: 0) + 1
    super.setAccessibilityLabel(view, label)
  }

  companion object {
    private val labelSetterCalls = WeakHashMap<ReactEditText, Int>()

    fun labelSetterCalls(view: ReactEditText): Int? = labelSetterCalls[view]
  }
}
