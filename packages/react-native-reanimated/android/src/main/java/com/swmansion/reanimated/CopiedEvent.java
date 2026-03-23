package com.swmansion.reanimated;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.RCTModernEventEmitter;

public class CopiedEvent {
  private int targetTag;
  private String eventName;
  private WritableMap payload;

  CopiedEvent(Event event) {
    event.dispatch(
        new RCTModernEventEmitter() {
          @Override
          public void receiveEvent(
              int targetTag, @NonNull String eventName, @Nullable WritableMap event) {
            CopiedEvent.this.targetTag = targetTag;
            CopiedEvent.this.eventName = eventName;
            assert event != null;
            CopiedEvent.this.payload = event.copy();
          }

          @Override
          public void receiveTouches(
              @NonNull String eventName,
              @NonNull WritableArray touches,
              @NonNull WritableArray changedIndices) {
            // noop
          }

          @Override
          public void receiveEvent(
              int surfaceId,
              int targetTag,
              @NonNull String eventName,
              @Nullable WritableMap params) {
            // noop
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
            // noop
          }
        });
  }

  public int getTargetTag() {
    return targetTag;
  }

  public String getEventName() {
    return eventName;
  }

  public WritableMap getPayload() {
    return payload;
  }
}
