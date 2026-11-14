package com.reanimatedbenchmark

import android.os.Process
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext

class BenchmarkReporterModule(reactContext: ReactApplicationContext) :
    NativeBenchmarkReporterSpec(reactContext) {

  override fun report(line: String) {
    Log.i(LOG_TAG, line)
  }

  override fun markReady(): Double = Process.myTid().toDouble()

  override fun currentEpochLoad(): String = NO_EPOCH_LOAD

  override fun countEpochWork(load: String): Boolean = false

  private companion object {
    const val LOG_TAG = "ReanimatedBenchmark"
    const val NO_EPOCH_LOAD = "none"
  }
}
