package com.swmansion.worklets.runloop;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;

@SuppressWarnings("JavaJniMissingFunction")
public class AnimationFrameCallback {

  @DoNotStrip
  @SuppressWarnings({"FieldCanBeLocal", "unused"})
  private final HybridData mHybridData;

  @DoNotStrip
  private AnimationFrameCallback(HybridData hybridData) {
    mHybridData = hybridData;
  }

  public native void onAnimationFrame(double timestampMs);
}
