package com.swmansion.reanimated.sensor

import android.hardware.Sensor

enum class ReanimatedSensorType(
    private val type: Int,
) {
    ACCELEROMETER(Sensor.TYPE_LINEAR_ACCELERATION),
    GYROSCOPE(Sensor.TYPE_GYROSCOPE),
    GRAVITY(Sensor.TYPE_GRAVITY),
    MAGNETIC_FIELD(Sensor.TYPE_MAGNETIC_FIELD),
    ROTATION_VECTOR(Sensor.TYPE_ROTATION_VECTOR),
    ;

    fun getType(): Int = type

    companion object {
        @JvmStatic
        fun getInstanceById(typeId: Int): ReanimatedSensorType =
            when (typeId) {
                1 -> ACCELEROMETER
                2 -> GYROSCOPE
                3 -> GRAVITY
                4 -> MAGNETIC_FIELD
                5 -> ROTATION_VECTOR
                else -> throw IllegalArgumentException("[Reanimated] Unknown sensor type.")
            }
    }
}
