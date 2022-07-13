package com.swmansion.reanimated.frameCallback;

import android.util.Log;
import android.view.Choreographer;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class FrameCallbackContainer {

  private int nextCallbackId = 0;
  private final Map<Integer, Runnable> frameCallbackRegistry = new HashMap<>();
  private final Set<Integer> frameCallbackActive = new HashSet<>();
  private boolean isAnimationRunning = false;

  private final String LOG_TAG = "FrameCallback";

  public int registerFrameCallback(Runnable callback) {
    Log.d(LOG_TAG, "registerFrameCallback()");

    int callbackId = nextCallbackId;
    nextCallbackId++;

    frameCallbackRegistry.put(callbackId, callback);

    return callbackId;
  }

  public void unregisterFrameCallback(int frameCallbackId) {
    Log.d(LOG_TAG, "unregisterFrameCallback");

    manageStateFrameCallback(frameCallbackId, false);
    frameCallbackRegistry.remove(frameCallbackId);
  }

  public void manageStateFrameCallback(int frameCallbackId, boolean state) {
    Log.d(LOG_TAG, "manageStateFrameCallback");
    if (state) {
      frameCallbackActive.add(frameCallbackId);
      if (!isAnimationRunning) {
        runAnimation(0);
      }
    } else {
      frameCallbackActive.remove(frameCallbackId);
    }
  }

  private void runAnimation(long frameTime) {
    for (Integer key : frameCallbackActive) {
      frameCallbackRegistry.get(key).run();
    }

    if (!frameCallbackActive.isEmpty()) {
      isAnimationRunning = true;
      Choreographer.getInstance().postFrameCallback(this::runAnimation);
    } else {
      isAnimationRunning = false;
    }
  }
}
