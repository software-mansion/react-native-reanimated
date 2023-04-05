package com.swmansion.reanimated;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;

import java.util.Map;

public class JavaWrapperJSCallbacksManager {

  static {
    SoLoader.loadLibrary("reanimated");
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  public JavaWrapperJSCallbacksManager() {
    mHybridData = initHybrid();
  }
  private native HybridData initHybrid();
  public native Map<String, Object> executeSharedAnimationProgressCallback(
    int viewTag,
    double progress,
    Map<String, Object> sharedAnimationWorkletData
  );

}
