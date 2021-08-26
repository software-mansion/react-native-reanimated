package com.swmansion.reanimated.sensor;

import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;

import com.swmansion.reanimated.NativeProxy;

public class ReanimatedSensorListener implements SensorEventListener {

    private NativeProxy.SensorSetter setter;
    private int counter = 0;

    ReanimatedSensorListener(NativeProxy.SensorSetter setter) {
        this.setter = setter;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        counter++;
        if(counter < 100) return;
        counter = 0;
        System.out.println(event.values[0]);
        setter.sensorSetter(event.values[0]); // TODO
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

}
