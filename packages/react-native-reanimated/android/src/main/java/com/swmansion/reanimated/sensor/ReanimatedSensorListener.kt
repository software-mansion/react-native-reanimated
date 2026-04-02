package com.swmansion.reanimated.sensor

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.view.Display
import android.view.Surface
import com.swmansion.reanimated.nativeProxy.SensorSetter

class ReanimatedSensorListener(
    private val setter: SensorSetter,
    private val interval: Double,
    private val display: Display,
) : SensorEventListener {
    private var lastRead = System.currentTimeMillis().toDouble()

    private val rotation = FloatArray(9)
    private val orientation = FloatArray(3)
    private val quaternion = FloatArray(4)

    override fun onSensorChanged(event: SensorEvent) {
        val current = System.currentTimeMillis().toDouble()
        if (current - lastRead < interval) {
            return
        }
        val sensorType = event.sensor.type
        lastRead = current

        val orientationDegrees =
            when (display.rotation) {
                Surface.ROTATION_90 -> 90
                Surface.ROTATION_180 -> 180
                Surface.ROTATION_270 -> 270
                else -> 0
            }

        when (sensorType) {
            Sensor.TYPE_ROTATION_VECTOR -> {
                SensorManager.getQuaternionFromVector(quaternion, event.values)
                SensorManager.getRotationMatrixFromVector(rotation, event.values)
                SensorManager.getOrientation(rotation, orientation)
                val data =
                    floatArrayOf(
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
                setter.sensorSetter(data, orientationDegrees)
            }
            Sensor.TYPE_GYROSCOPE,
            Sensor.TYPE_MAGNETIC_FIELD,
            -> {
                val data = floatArrayOf(event.values[0], event.values[1], event.values[2])
                setter.sensorSetter(data, orientationDegrees)
            }
            Sensor.TYPE_GRAVITY,
            Sensor.TYPE_LINEAR_ACCELERATION,
            -> {
                val data = floatArrayOf(-event.values[0], -event.values[1], -event.values[2])
                setter.sensorSetter(data, orientationDegrees)
            }
            else -> throw IllegalArgumentException("[Reanimated] Unknown sensor type.")
        }
    }

    override fun onAccuracyChanged(
        sensor: Sensor,
        accuracy: Int,
    ) {}
}
