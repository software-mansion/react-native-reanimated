package com.swmansion.reanimated.example;

import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

    @Override
    protected String getMainComponentName() {
        return "ReanimatedExample";
    }

    public native String getString();

}
