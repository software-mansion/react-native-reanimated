package com.swmansion.reanimated.nativeProxy;

import androidx.annotation.Nullable;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;

public class EventHandlerMock implements RCTEventEmitter {
  @Override
  public void receiveEvent(int i, String s, @Nullable WritableMap writableMap) {
    // NOOP
  }

  @Override
  public void receiveTouches(String s, WritableArray writableArray, WritableArray writableArray1) {
    // NOOP
  }
}
