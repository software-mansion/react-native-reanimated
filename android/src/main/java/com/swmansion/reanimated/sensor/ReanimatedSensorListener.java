package com.swmansion.reanimated.sensor;

import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;

import com.swmansion.reanimated.NativeProxy;

public class ReanimatedSensorListener implements SensorEventListener {

    private NativeProxy.SensorSetter setter;
    private int counter = 0;
    private double lastRead = (double) System.currentTimeMillis();
    private double interval;

    ReanimatedSensorListener(NativeProxy.SensorSetter setter, double interval) {
        this.setter = setter;
        this.interval = interval;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        double current = (double) System.currentTimeMillis();
        if (current - lastRead < interval) {
            return;
        }
        lastRead = current;
        System.out.println(event.values[0]);
        setter.sensorSetter(event.values[0]); // TODO
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

}
