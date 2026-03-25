package com.swmansion.reanimated.nativeProxy;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
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
    // NOOP
  }
}
