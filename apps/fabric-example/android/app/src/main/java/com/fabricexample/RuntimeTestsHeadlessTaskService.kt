package com.fabricexample

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class RuntimeTestsHeadlessTaskService : HeadlessJsTaskService() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (BuildConfig.DEBUG || BuildConfig.RUNTIME_TESTS) {
      intent?.getStringExtra("RUNTIME_TESTS_LIBRARY")?.let {
        MainApplication.runtimeTestsLibrary = it
      }
    }
    RuntimeTestsBundlerHost.apply(this, intent)
    return super.onStartCommand(intent, flags, startId)
  }

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
    val data = Arguments.createMap()
    intent?.getStringExtra("RUNTIME_TESTS_WS_URL")?.let { data.putString("wsUrl", it) }
    return HeadlessJsTaskConfig(TASK_KEY, data, TASK_TIMEOUT_MS, true)
  }

  companion object {
    private const val TASK_KEY = "RuntimeTestsHeadlessRun"
    private const val TASK_TIMEOUT_MS = 15 * 60 * 1000L
  }
}
