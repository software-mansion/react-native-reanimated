package com.swmansion.worklets;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = DummyWorkletsModule.NAME)
public class DummyWorkletsModule extends
        NativeDummyWorkletsSpec {

  public DummyWorkletsModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public boolean installTurboModule() {
    return true;
  }
}
