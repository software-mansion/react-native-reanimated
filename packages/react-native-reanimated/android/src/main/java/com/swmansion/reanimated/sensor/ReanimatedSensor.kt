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
    val interval: Int

    companion object {
        private const val DEFAULT_INTERVAL = 8
    }

    init {
        sensorManager =
            reactContext.get()!!.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        this.interval = if (listenerInterval == -1) DEFAULT_INTERVAL else listenerInterval
    }

    fun initialize(): Boolean {
        val displayManager = reactContext.get()!!.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val display = displayManager.getDisplay(Display.DEFAULT_DISPLAY) ?: return false
        sensor = sensorManager.getDefaultSensor(sensorType.getType()) ?: return false
        listener = ReanimatedSensorListener(setter, listenerInterval.toDouble(), display, sensorType)
        sensorManager.registerListener(listener, sensor, interval * 1000)
        return true
    }

    fun cancel() {
        sensorManager.unregisterListener(listener, sensor)
    }
}
