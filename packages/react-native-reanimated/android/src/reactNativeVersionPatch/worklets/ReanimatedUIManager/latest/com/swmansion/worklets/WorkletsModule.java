package com.swmansion.worklets;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import javax.annotation.Nullable;

@ReactModule(name = WorkletsModule.NAME)
public class WorkletsModule extends CommonWorkletsModuleSpec {
  public static final String NAME = "WorkletsModule";
  private @Nullable WorkletsNativeProxy mWorkletsNativeProxy;

  public WorkletsNativeProxy getWorkletsNativeProxy() {
    return mWorkletsNativeProxy;
  }

  public WorkletsModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public void initialize() {
    // Do nothing.
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installTurboModule(String valueUnpackerCode) {
    mWorkletsNativeProxy = new WorkletsNativeProxy(getReactApplicationContext(), valueUnpackerCode);
    return true;
  }

  @Override
  public void invalidate() {
    super.invalidate();
  }
}
