package com.swmansion.reanimated.keyboard;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;

@DoNotStrip
public class KeyboardWorkletWrapper {
  @DoNotStrip private final HybridData mHybridData;

  @DoNotStrip
  private KeyboardWorkletWrapper(HybridData hybridData) {
    mHybridData = hybridData;
  }

  public native void invoke(int keyboardState, int height);
}
