package com.swmansion.worklets.AnimationFrameQueue;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;

/**
 * @noinspection JavaJniMissingFunction
 */
@DoNotStrip
public class AnimationFrameCallback {

  /**
   * @noinspection FieldCanBeLocal, unused
   */
  @DoNotStrip private final HybridData mHybridData;

  @DoNotStrip
  private AnimationFrameCallback(HybridData hybridData) {
    mHybridData = hybridData;
  }

  public native void onAnimationFrame(double timestampMs);
}
