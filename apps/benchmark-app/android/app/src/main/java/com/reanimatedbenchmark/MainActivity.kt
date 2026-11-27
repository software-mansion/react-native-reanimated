package com.reanimatedbenchmark

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "ReanimatedBenchmark"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName) {
        override fun getLaunchOptions(): Bundle = launchOptionsFromIntent()
      }

  private fun launchOptionsFromIntent(): Bundle {
    val launchOptions = Bundle()
    intent.getStringExtra(SCENARIO_EXTRA)?.let { launchOptions.putString("scenario", it) }
    if (intent.hasExtra(LOAD_EXTRA)) {
      launchOptions.putInt("load", intent.getIntExtra(LOAD_EXTRA, 0))
    }
    return launchOptions
  }

  private companion object {
    const val SCENARIO_EXTRA = "benchmarkScenario"
    const val LOAD_EXTRA = "benchmarkLoad"
  }
}
