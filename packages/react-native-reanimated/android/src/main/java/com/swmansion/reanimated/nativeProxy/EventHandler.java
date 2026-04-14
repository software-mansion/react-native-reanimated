package com.swmansion.reanimated.nativeProxy;

import androidx.annotation.Nullable;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.RCTEventEmitter;

@DoNotStrip
public class EventHandler implements RCTEventEmitter {

  @DoNotStrip private final HybridData mHybridData;

  public UIManagerModule.CustomEventNamesResolver mCustomEventNamesResolver;
  public boolean mIsInDrawPass;

  @DoNotStrip
  private EventHandler(HybridData hybridData) {
    mHybridData = hybridData;
  }

  @Override
  public void receiveEvent(int emitterReactTag, String eventName, @Nullable WritableMap event) {
    String resolvedEventName = mCustomEventNamesResolver.resolveCustomEventName(eventName);
    receiveEvent(resolvedEventName, emitterReactTag, event, mIsInDrawPass);
  }

  public native void receiveEvent(
      String eventName, int emitterReactTag, @Nullable WritableMap event, boolean isInDrawPass);

  @Override
  public void receiveTouches(
      String eventName, WritableArray touches, WritableArray changedIndices) {
    // not interested in processing touch events this way, we process raw events only
  }
}
