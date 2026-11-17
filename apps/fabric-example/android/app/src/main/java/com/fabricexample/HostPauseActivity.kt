package com.fabricexample

import android.app.Activity
import android.os.Bundle

class HostPauseActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    current = this
  }

  override fun onResume() {
    super.onResume()
    onResumed?.invoke()
    onResumed = null
  }

  override fun onDestroy() {
    if (current === this) {
      current = null
    }
    super.onDestroy()
  }

  companion object {
    var current: HostPauseActivity? = null
    var onResumed: (() -> Unit)? = null
  }
}
