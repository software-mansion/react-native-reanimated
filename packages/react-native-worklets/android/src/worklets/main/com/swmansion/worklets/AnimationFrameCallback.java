package com.swmansion.worklets;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;

/**
 * @noinspection JavaJniMissingFunction
 */
@DoNotStrip
public class AnimationFrameCallback {

  @DoNotStrip private final HybridData mHybridData;

  @DoNotStrip
  private AnimationFrameCallback(HybridData hybridData) {
    mHybridData = hybridData;
  }

  public native void onAnimationFrame(double timestampMs);
}
