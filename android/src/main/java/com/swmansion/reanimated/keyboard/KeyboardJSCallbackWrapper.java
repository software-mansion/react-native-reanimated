package com.swmansion.reanimated.keyboard;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;

@DoNotStrip
public class KeyboardJSCallbackWrapper {
  @DoNotStrip private final HybridData mHybridData;

  @DoNotStrip
  private KeyboardJSCallbackWrapper(HybridData hybridData) {
    mHybridData = hybridData;
  }

  public native void callCallback(int keyboardState, int height);
}
