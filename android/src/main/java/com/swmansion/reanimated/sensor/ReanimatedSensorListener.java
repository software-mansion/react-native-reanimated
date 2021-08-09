package com.swmansion.reanimated.sensor;

import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;

public class ReanimatedSensorListener implements SensorEventListener {

    private float[] data;

    @Override
    public void onSensorChanged(SensorEvent event) {
        data = event.values;
        System.out.println(event.values[0]);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    public float[] getData() {
        return data;
    }

}
