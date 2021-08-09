package com.swmansion.reanimated.sensor;

import android.hardware.Sensor;
import android.hardware.SensorManager;

import com.facebook.react.bridge.ReactApplicationContext;

import java.lang.ref.WeakReference;

public class ReanimatedSensor {

    ReanimatedSensorListener listener;
    SensorManager sensorManager;
    Sensor sensor;

    ReanimatedSensor(WeakReference<ReactApplicationContext> reactContext, int interval) {
        listener = new ReanimatedSensorListener();
        sensorManager = (SensorManager)reactContext.get()
                .getSystemService(reactContext.get().SENSOR_SERVICE);
        sensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        sensorManager.registerListener(listener, sensor, interval * 1000);
    }

}
