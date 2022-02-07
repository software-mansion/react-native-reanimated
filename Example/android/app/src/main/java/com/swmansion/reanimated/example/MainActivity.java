package com.swmansion.reanimated.example;

import android.util.Log;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactRootView;

import com.facebook.react.bridge.ReactContext;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;
import com.swmansion.reanimated.NativeProxy;

public class MainActivity extends ReactActivity {

    @Override
    protected String getMainComponentName() {
        return "ReanimatedExample";
    }

    // Add the following method to your main activity class
    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new ReactActivityDelegate(this, getMainComponentName()) {
            @Override
            protected ReactRootView createRootView() {
                return new RNGestureHandlerEnabledRootView(MainActivity.this);
            }
        };
    }

    public native String getString();

}
