package com.swmansion.reanimated;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.RCTModernEventEmitter;

public class CopiedEvent {
  private int surfaceId;
  private int targetTag;
  private String eventName;
  private boolean canCoalesceEvent;
  private int customCoalesceKey;
  private WritableMap payload;
  private int category;

  CopiedEvent(Event<?> event) {
    event.dispatchModern(
        new RCTModernEventEmitter() {
          @Override
          public void receiveTouches(
              @NonNull String eventName,
              @NonNull WritableArray touches,
              @NonNull WritableArray changedIndices) {
            // noop
          }

          @Override
          public void receiveEvent(
              int targetTag, @NonNull String eventName, @Nullable WritableMap params) {
            CopiedEvent.this.targetTag = targetTag;
            CopiedEvent.this.eventName = eventName;
            assert params != null;
            CopiedEvent.this.payload = params.copy();
          }

          @Override
          public void receiveEvent(
              int surfaceId,
              int targetTag,
              @NonNull String eventName,
              @Nullable WritableMap params) {
            CopiedEvent.this.surfaceId = surfaceId;
            CopiedEvent.this.targetTag = targetTag;
            CopiedEvent.this.eventName = eventName;
            assert params != null;
            CopiedEvent.this.payload = params.copy();
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
            CopiedEvent.this.surfaceId = surfaceId;
            CopiedEvent.this.targetTag = targetTag;
            CopiedEvent.this.eventName = eventName;
            CopiedEvent.this.canCoalesceEvent = canCoalesceEvent;
            CopiedEvent.this.customCoalesceKey = customCoalesceKey;
            assert params != null;
            CopiedEvent.this.payload = params.copy();
            CopiedEvent.this.category = category;
          }
        });
  }

  public int getSurfaceId() {
    return surfaceId;
  }

  public int getTargetTag() {
    return targetTag;
  }

  public String getEventName() {
    return eventName;
  }

  public boolean getCanCoalesceEvent() {
    return canCoalesceEvent;
  }

  public int getCustomCoalesceKey() {
    return customCoalesceKey;
  }

  public WritableMap getPayload() {
    return payload;
  }

  public int getCategory() {
    return category;
  }
}
