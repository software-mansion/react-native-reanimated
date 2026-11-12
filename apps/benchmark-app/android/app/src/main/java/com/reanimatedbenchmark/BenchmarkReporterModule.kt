package com.reanimatedbenchmark

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext

class BenchmarkReporterModule(reactContext: ReactApplicationContext) :
    NativeBenchmarkReporterSpec(reactContext) {

  override fun report(line: String) {
    Log.i(LOG_TAG, line)
  }

  private companion object {
    const val LOG_TAG = "ReanimatedBenchmark"
  }
}
