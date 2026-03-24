package com.swmansion.reanimated.nativeProxy;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.RCTModernEventEmitter;

@DoNotStrip
public class EventHandler implements RCTModernEventEmitter {

  @SuppressWarnings("FieldCanBeLocal")
  @DoNotStrip
  private final HybridData mHybridData;

  public UIManagerModule.CustomEventNamesResolver mCustomEventNamesResolver;

  @DoNotStrip
  private EventHandler(HybridData hybridData) {
    mHybridData = hybridData;
  }

  @Override
  public void receiveEvent(
      int surfaceId,
      int targetTag,
      @NonNull String eventName,
      boolean canCoalesceEvent,
      int customCoalesceKey,
      @Nullable WritableMap params,
      int category) {
    String resolvedEventName = mCustomEventNamesResolver.resolveCustomEventName(eventName);
    receiveEvent(resolvedEventName, targetTag, params);
  }

  @SuppressWarnings("JavaJniMissingFunction")
  public native void receiveEvent(
      String eventName, int emitterReactTag, @Nullable WritableMap event);
}
