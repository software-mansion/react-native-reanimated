package com.swmansion.reanimated.sensor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.swmansion.reanimated.nativeProxy.SensorSetter
import java.lang.ref.WeakReference

internal class ReanimatedSensor(
    reactContext: WeakReference<ReactApplicationContext>,
    val sensorType: ReanimatedSensorType,
    interval: Int,
    setter: SensorSetter,
) {
    val listener: ReanimatedSensorListener
    val sensorManager: SensorManager
    val sensor: Sensor?
    val interval: Int

    companion object {
        private const val DEFAULT_INTERVAL = 8
    }

    init {
        val wm = reactContext.get()!!.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val display = wm.defaultDisplay
        sensorManager =
            reactContext.get()!!.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        sensor = sensorManager.getDefaultSensor(sensorType.getType())
        listener =
            ReanimatedSensorListener(
                setter,
                interval.toDouble(),
                display,
                sensorType,
                sensor?.maximumRange ?: 0f,
            )
        this.interval = if (interval == -1) DEFAULT_INTERVAL else interval
    }

    fun initialize(): Boolean {
        if (sensor == null) {
            return false
        }
        sensorManager.registerListener(listener, sensor, interval * 1000)
        return true
    }

    fun cancel() {
        sensorManager.unregisterListener(listener, sensor)
    }
}
