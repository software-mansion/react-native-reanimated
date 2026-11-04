package com.swmansion.reanimated.sensor

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import android.view.Display
import android.view.Surface
import com.swmansion.reanimated.nativeProxy.SensorSetter

class ReanimatedSensorListener(
    private val setter: SensorSetter,
    private val interval: Double,
    private val display: Display,
    private val sensorType: ReanimatedSensorType,
) : SensorEventListener {
    private var lastRead = System.currentTimeMillis().toDouble()
    private var didWarnAboutMislabeledEvent = false

    private val rotation = FloatArray(9)
    private val orientation = FloatArray(3)
    private val quaternion = FloatArray(4)

    override fun onSensorChanged(event: SensorEvent) {
        val current = System.currentTimeMillis().toDouble()
        if (current - lastRead < interval) {
            return
        }
        lastRead = current
        warnOnceAboutMislabeledEvent(event.sensor)

        val orientationDegrees =
            when (display.rotation) {
                Surface.ROTATION_90 -> 90
                Surface.ROTATION_180 -> 180
                Surface.ROTATION_270 -> 270
                else -> 0
            }

        val values = event.values
        val data =
            when (sensorType) {
                ReanimatedSensorType.ROTATION_VECTOR -> rotationData(values)
                ReanimatedSensorType.GYROSCOPE,
                ReanimatedSensorType.MAGNETIC_FIELD,
                -> floatArrayOf(values[0], values[1], values[2])
                ReanimatedSensorType.GRAVITY,
                ReanimatedSensorType.ACCELEROMETER,
                -> floatArrayOf(-values[0], -values[1], -values[2])
            }
        setter.sensorSetter(data, orientationDegrees)
    }

    override fun onAccuracyChanged(
        sensor: Sensor,
        accuracy: Int,
    ) {}

    private fun warnOnceAboutMislabeledEvent(eventSensor: Sensor) {
        if (didWarnAboutMislabeledEvent || eventSensor.type == sensorType.getType()) {
            return
        }
        didWarnAboutMislabeledEvent = true
        Log.w(
            "Reanimated",
            "Sensor $sensorType (type ${sensorType.getType()}) receives events from " +
                "\"${eventSensor.name}\" (type ${eventSensor.type}).",
        )
    }

    private fun rotationData(values: FloatArray): FloatArray {
        SensorManager.getQuaternionFromVector(quaternion, values)
        SensorManager.getRotationMatrixFromVector(rotation, values)
        SensorManager.getOrientation(rotation, orientation)
        return floatArrayOf(
            quaternion[1], // qx
            quaternion[3], // qy -> we set qz to match iOS
            -quaternion[2], // qz -> we set -qy to match iOS
            quaternion[0], // qw
            // make Android consistent with iOS, which is better documented here:
            // https://developer.apple.com/documentation/coremotion/getting_processed_device-motion_data/
            -orientation[0], // yaw
            -orientation[1], // pitch
            orientation[2], // roll
        )
    }
}
