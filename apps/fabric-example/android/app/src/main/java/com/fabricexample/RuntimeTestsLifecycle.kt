package com.fabricexample

import android.Manifest
import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import com.facebook.react.ReactHost

/** Hooks that `scripts/runtime-tests-server.js` uses to drive the lifecycle scenarios. */
object RuntimeTestsLifecycle {
  private const val RELOAD_ACTION = "com.fabricexample.RUNTIME_TESTS_RELOAD"
  private const val INVALIDATE_FIRST_EXTRA = "INVALIDATE_FIRST"

  private val MODULE_NAMES =
    mapOf("reanimated" to "ReanimatedModule", "worklets" to "WorkletsModule")

  /**
   * Reloads the React instance when the server broadcasts [RELOAD_ACTION] with `adb`.
   * `DevSettings.reload()` does nothing in Release builds.
   */
  fun registerReloadReceiver(application: Application, reactHost: () -> ReactHost) {
    val receiver =
      object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          val host = reactHost()
          intent.getStringExtra(INVALIDATE_FIRST_EXTRA)?.let { library ->
            val moduleName = checkNotNull(MODULE_NAMES[library]) { "Unknown library: $library" }
            invalidateFirst(host, moduleName)
          }
          host.reload("runtime-tests")
        }
      }
    ContextCompat.registerReceiver(
      application,
      receiver,
      IntentFilter(RELOAD_ACTION),
      // Held by the shell user that `adb` runs as, but not by other apps.
      Manifest.permission.DUMP,
      null,
      ContextCompat.RECEIVER_EXPORTED,
    )
  }

  /**
   * React Native invalidates native modules in the order in which they were first requested, which
   * depends on how the app starts. This moves the module to the front of that order.
   * React Native has no API for it, hence the private fields. A failure here crashes the app, so
   * that the scenario fails instead of running in the wrong order.
   */
  private fun invalidateFirst(reactHost: ReactHost, moduleName: String) {
    val reactInstance =
      checkNotNull(reactHost.privateField("reactInstance")) { "No React instance" }
    val turboModuleManager = checkNotNull(reactInstance.privateField("turboModuleManager"))
    val moduleCleanupLock = checkNotNull(turboModuleManager.privateField("moduleCleanupLock"))
    @Suppress("UNCHECKED_CAST")
    val moduleHolders =
      checkNotNull(turboModuleManager.privateField("moduleHolders")) as MutableMap<String, Any>
    synchronized(moduleCleanupLock) {
      val holder = checkNotNull(moduleHolders[moduleName]) { "$moduleName was never requested" }
      val otherHolders = moduleHolders.filterKeys { it != moduleName }
      moduleHolders.clear()
      moduleHolders[moduleName] = holder
      moduleHolders.putAll(otherHolders)
    }
  }

  private fun Any.privateField(name: String): Any? =
    javaClass.getDeclaredField(name).apply { isAccessible = true }.get(this)
}
