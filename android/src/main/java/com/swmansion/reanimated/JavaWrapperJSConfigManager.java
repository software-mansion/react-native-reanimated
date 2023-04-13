package com.swmansion.reanimated;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;
import com.swmansion.reanimated.layoutReanimation.SharedTransitionType;

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

  public SharedTransitionType getSharedTransitionConfigEnum(int viewTag) {
    int transitionType = getSharedTransitionConfig(viewTag);
    if (transitionType == 0) {
      return SharedTransitionType.PROGRESS;
    } else {
      return SharedTransitionType.ANIMATION;
    }
  }
}
