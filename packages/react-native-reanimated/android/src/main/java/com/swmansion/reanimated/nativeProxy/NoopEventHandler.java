package com.swmansion.reanimated.nativeProxy;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTModernEventEmitter;

public class NoopEventHandler implements RCTModernEventEmitter {
  @Override
  public void receiveEvent(
      int surfaceId,
      int targetTag,
      @NonNull String eventName,
      boolean canCoalesceEvent,
      int customCoalesceKey,
      @Nullable WritableMap params,
      int category) {
    // noop
  }

  @Override
  public void receiveEvent(
      int surfaceId, int targetTag, @NonNull String eventName, @Nullable WritableMap params) {
    // noop
  }

  @Override
  public void receiveEvent(int targetTag, @NonNull String eventName, @Nullable WritableMap params) {
    // noop
  }

  @Override
  public void receiveTouches(
      @NonNull String eventName,
      @NonNull WritableArray touches,
      @NonNull WritableArray changedIndices) {
    // noop
  }
}
