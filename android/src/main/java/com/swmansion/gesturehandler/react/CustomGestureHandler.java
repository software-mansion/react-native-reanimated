package com.swmansion.gesturehandler.react;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = "RNGestureHandlerModule")
public interface CustomGestureHandler extends NativeModule {
    void setGestureState(int handlerTag, int newState);
}
