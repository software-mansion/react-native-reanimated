package com.swmansion.reanimated;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;

public class JavaWrapperJSConfigManager {

  static {
    SoLoader.loadLibrary("reanimated");
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  public JavaWrapperJSConfigManager() {
    mHybridData = initHybrid();
  }
  private native HybridData initHybrid();
  public native int getSharedTransitionConfig(int viewTag);

}
