package com.swmansion.reanimated.sensor;

import android.hardware.Sensor;

import com.facebook.react.bridge.ReactApplicationContext;

import java.lang.ref.WeakReference;
import java.util.HashMap;

public class ReanimatedSensorContainer {

    private static int id = 0;
    private final WeakReference<ReactApplicationContext> reactContext;
    private final HashMap<Integer, ReanimatedSensor> sensors = new HashMap<>();

    public ReanimatedSensorContainer(WeakReference<ReactApplicationContext> reactContext) {
        this.reactContext = reactContext;
        id++;
    }

    public int registerSensor(int sensorType) {
        sensors.put(id, new ReanimatedSensor(reactContext, 1));
        return id;
    }

    public void rejectSensor(int sensorId) {
        sensors.remove(sensorId);
    }
}
