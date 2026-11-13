package com.reanimatedbenchmark

import android.os.Process
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext

class BenchmarkReporterModule(reactContext: ReactApplicationContext) :
    NativeBenchmarkReporterSpec(reactContext) {

  override fun report(line: String) {
    Log.i(LOG_TAG, line)
  }

  override fun currentThreadId(): Double = Process.myTid().toDouble()

  private companion object {
    const val LOG_TAG = "ReanimatedBenchmark"
  }
}
