package com.swmansion.reanimated.sensor;

import android.hardware.Sensor;
import android.hardware.SensorManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.swmansion.reanimated.NativeProxy;

import java.lang.ref.WeakReference;

public class ReanimatedSensor {

    ReanimatedSensorListener listener;
    SensorManager sensorManager;
    Sensor sensor;

    ReanimatedSensor(
        WeakReference<ReactApplicationContext> reactContext,
        int sensorType,
        int interval,
        NativeProxy.SensorSetter setter
    ) {
        listener = new ReanimatedSensorListener(setter);
        sensorManager = (SensorManager)reactContext.get()
                .getSystemService(reactContext.get().SENSOR_SERVICE);
        sensor = sensorManager.getDefaultSensor(sensorType);
        sensorManager.registerListener(listener, sensor, interval * 1000);
    }

}
