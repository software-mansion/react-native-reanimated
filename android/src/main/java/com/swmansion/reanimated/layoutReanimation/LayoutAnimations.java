package com.swmansion.reanimated.layoutReanimation;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.soloader.SoLoader;
import com.swmansion.reanimated.ReanimatedModule;
import java.lang.ref.WeakReference;
import java.util.Map;

public class LayoutAnimations {
  static {
    SoLoader.loadLibrary("reanimated");
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  private WeakReference<ReactApplicationContext> mContext;

  public LayoutAnimations(ReactApplicationContext context) {
    mContext = new WeakReference<>(context);
    mHybridData = initHybrid();
  }

  private native HybridData initHybrid();

  // LayoutReanimation
  public native void startAnimationForTag(int tag, String type, Map<String, String> values);

  public native boolean hasAnimationForTag(int tag, String type);

  public native boolean isLayoutAnimationEnabled();

  private void endLayoutAnimation(int tag, boolean cancelled, String type) {
    ReactApplicationContext context = mContext.get();
    if (context != null) {
      context
          .getNativeModule(ReanimatedModule.class)
          .getNodesManager()
          .getAnimationsManager()
          .endLayoutAnimation(tag, cancelled, type);
    }
  }

  private void progressLayoutAnimation(int tag, Map<String, Object> newStyle) {
    ReactApplicationContext context = mContext.get();
    if (context != null) {
      context
          .getNativeModule(ReanimatedModule.class)
          .getNodesManager()
          .getAnimationsManager()
          .progressLayoutAnimation(tag, newStyle);
    }
  }
}
