package com.swmansion.worklets;

import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import javax.annotation.Nonnull;

public abstract class NativeWorkletsModuleSpec extends ReactContextBaseJavaModule
    implements TurboModule {
  public static final String NAME = "WorkletsModule";

  public NativeWorkletsModuleSpec(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public @Nonnull String getName() {
    return NAME;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  @DoNotStrip
  public abstract boolean installTurboModule();
}
