package com.swmansion.reanimated.frameCallback;

import android.util.Log;
import android.view.Choreographer;

import com.facebook.react.bridge.UiThreadUtil;
import com.swmansion.reanimated.NativeProxy;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class FrameCallbackManager {

  private int nextCallbackId = 0;
  private final Map<Integer, NativeProxy.FrameCallbackHook> frameCallbackRegistry = new HashMap<>();
  private final Set<Integer> frameCallbackActive = new HashSet<>();
  private boolean isAnimationRunning = false;

  private final String LOG_TAG = "FrameCallback";

  public int registerFrameCallback(NativeProxy.FrameCallbackHook callback) {
    int callbackId = nextCallbackId;
    nextCallbackId++;

    frameCallbackRegistry.put(callbackId, callback);

    return callbackId;
  }

  public void unregisterFrameCallback(int frameCallbackId) {
    manageStateFrameCallback(frameCallbackId, false);
    frameCallbackRegistry.remove(frameCallbackId);
  }

  public void manageStateFrameCallback(int frameCallbackId, boolean state) {
    if (state) {
      frameCallbackActive.add(frameCallbackId);
      if (!isAnimationRunning) {
        UiThreadUtil.runOnUiThread(() -> runAnimation(0));
      }
    } else {
      frameCallbackActive.remove(frameCallbackId);
    }
  }

  private void runAnimation(long frameTime) {
    for (Integer key : frameCallbackActive) {
      frameCallbackRegistry.get(key).frameCallback();
    }

    if (!frameCallbackActive.isEmpty()) {
      isAnimationRunning = true;
      Choreographer.getInstance().postFrameCallback(this::runAnimation);
    } else {
      isAnimationRunning = false;
    }
  }
}
