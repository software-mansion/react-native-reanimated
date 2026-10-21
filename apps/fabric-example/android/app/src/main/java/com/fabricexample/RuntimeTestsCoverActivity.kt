package com.fabricexample

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View

/**
 * Runtime tests only. An opaque activity of the app over the main activity for [DURATION_MS] of its intent, then it
 * ends: the main activity pauses and stops, and resumes after it.
 */
class RuntimeTestsCoverActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(View(this))
    Handler(Looper.getMainLooper()).postDelayed(::finish, intent.getLongExtra(DURATION_MS, 0))
  }

  companion object {
    const val DURATION_MS = "durationMs"
  }
}
