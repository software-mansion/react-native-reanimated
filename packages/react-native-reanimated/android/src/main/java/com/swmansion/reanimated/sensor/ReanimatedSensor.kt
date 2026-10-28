package com.swmansion.reanimated.sensor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import android.hardware.display.DisplayManager
import android.view.Display
import com.facebook.react.bridge.ReactApplicationContext
import com.swmansion.reanimated.nativeProxy.SensorSetter
import java.lang.ref.WeakReference

internal class ReanimatedSensor(
    private val reactContext: WeakReference<ReactApplicationContext>,
    val sensorType: ReanimatedSensorType,
    private val listenerInterval: Int,
    private val setter: SensorSetter,
) {
    var listener: ReanimatedSensorListener? = null
    val sensorManager: SensorManager
    var sensor: Sensor? = null

    init {
        sensorManager =
            reactContext.get()!!.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }

    fun initialize(): Boolean {
        val displayManager = reactContext.get()!!.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val display = displayManager.getDisplay(Display.DEFAULT_DISPLAY) ?: return false
        sensor = sensorManager.getDefaultSensor(sensorType.getType()) ?: return false
        listener = ReanimatedSensorListener(setter, listenerInterval.toDouble(), display, sensorType)
        sensorManager.registerListener(listener, sensor, getSamplingPeriodUs(display))
        return true
    }

    // `interval: 'auto'` (-1) matches the refresh rate of the display, as on iOS. Sampling faster
    // only wakes the UI thread for readings that no frame will show.
    private fun getSamplingPeriodUs(display: Display): Int {
        if (listenerInterval != -1) {
            return listenerInterval * 1000
        }
        val refreshRate = display.refreshRate.takeIf { it > 0 } ?: DEFAULT_REFRESH_RATE
        return (1_000_000 / refreshRate).toInt()
    }

    companion object {
        private const val DEFAULT_REFRESH_RATE = 60f
    }

    fun cancel() {
        sensorManager.unregisterListener(listener, sensor)
    }
}
