package com.swmansion.reanimated.sensor

import android.content.Context
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.swmansion.reanimated.nativeProxy.SensorSetter
import java.lang.ref.WeakReference

class ReanimatedSensorContainer(
    private val reactContext: WeakReference<ReactApplicationContext>,
) {
    private var nextSensorId = 0
    private val sensors = HashMap<Int, ReanimatedSensor>()

    fun isSensorAvailable(sensorType: ReanimatedSensorType): Boolean {
        val sensorManager =
            reactContext.get()?.getSystemService(Context.SENSOR_SERVICE) as SensorManager?
                ?: return false
        return sensorManager.getDefaultSensor(sensorType.getType()) != null
    }

    fun registerSensor(
        sensorType: ReanimatedSensorType,
        interval: Int,
        setter: SensorSetter,
    ): Int {
        val sensor = ReanimatedSensor(reactContext, sensorType, interval, setter)
        var sensorId = -1
        if (sensor.initialize()) {
            sensorId = nextSensorId
            nextSensorId++
            sensors[sensorId] = sensor
        }
        return sensorId
    }

    fun unregisterSensor(sensorId: Int) {
        val sensor = sensors[sensorId]
        if (sensor != null) {
            sensor.cancel()
            sensors.remove(sensorId)
        } else {
            Log.e("Reanimated", "Tried to unregister nonexistent sensor")
        }
    }
}
