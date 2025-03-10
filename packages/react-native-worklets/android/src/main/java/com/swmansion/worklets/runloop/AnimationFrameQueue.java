package com.swmansion.worklets.runloop;

import android.os.SystemClock;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.modules.core.ReactChoreographer;
import com.facebook.react.uimanager.GuardedFrameCallback;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

public class AnimationFrameQueue {

  private Long mFirstUptime = SystemClock.uptimeMillis();
  private boolean mSlowAnimationsEnabled = false;
  private double lastFrameTimeMs;
  private int mAnimationsDragFactor = 1;

  /// ReactChoreographer is
  /// <a
  // href="https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/core/ReactChoreographer.kt#L21">thread safe</a>.
  ///
  private final ReactChoreographer mReactChoreographer = ReactChoreographer.getInstance();
  private final GuardedFrameCallback mChoreographerCallback;
  private final AtomicBoolean mCallbackPosted = new AtomicBoolean();
  private final AtomicBoolean mPaused = new AtomicBoolean();
  private final List<AnimationFrameCallback> mFrameCallbacks = new ArrayList<>();

  public AnimationFrameQueue(ReactApplicationContext reactApplicationContext) {
    mChoreographerCallback =
        new GuardedFrameCallback(reactApplicationContext) {
          @Override
          protected void doFrameGuarded(long frameTimeNanos) {
            executeQueue(frameTimeNanos);
          }
        };
  }

  public void resume() {
    if (mPaused.getAndSet(false)) {
      scheduleQueueExecution();
    }
  }

  public void pause() {
    synchronized (mPaused) {
      if (!mPaused.getAndSet(true) && mCallbackPosted.getAndSet(false)) {
        mReactChoreographer.removeFrameCallback(
            ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE, mChoreographerCallback);
      }
    }
  }

  public void requestAnimationFrame(AnimationFrameCallback animationFrameCallback) {
    synchronized (mFrameCallbacks) {
      mFrameCallbacks.add(animationFrameCallback);
    }
    scheduleQueueExecution();
  }

  public void enableSlowAnimations(boolean slowAnimationsEnabled, int animationsDragFactor) {
    mSlowAnimationsEnabled = slowAnimationsEnabled;
    mAnimationsDragFactor = animationsDragFactor;
    if (slowAnimationsEnabled) {
      mFirstUptime = SystemClock.uptimeMillis();
    }
  }

  private void scheduleQueueExecution() {
    synchronized (mPaused) {
      if (!mPaused.get() && !mCallbackPosted.getAndSet(true)) {
        mReactChoreographer.postFrameCallback(
            ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE, mChoreographerCallback);
      }
    }
  }

  private void executeQueue(long frameTimeNanos) {
    double currentFrameTimeMs = calculateTimestamp(frameTimeNanos);
    if (currentFrameTimeMs <= lastFrameTimeMs) {
      // It is possible for ChoreographerCallback to be executed twice within the same frame
      // due to frame drops. If this occurs, the additional callback execution should be ignored.
      mCallbackPosted.set(false);
      scheduleQueueExecution();
      return;
    }

    var frameCallbacks = pullCallbacks();
    mCallbackPosted.set(false);

    lastFrameTimeMs = currentFrameTimeMs;
    for (var callback : frameCallbacks) {
      callback.onAnimationFrame(currentFrameTimeMs);
    }
  }

  private List<AnimationFrameCallback> pullCallbacks() {
    synchronized (mFrameCallbacks) {
      List<AnimationFrameCallback> frameCallbacks = new ArrayList<>(mFrameCallbacks);
      mFrameCallbacks.clear();
      return frameCallbacks;
    }
  }

  private double calculateTimestamp(long frameTimeNanos) {
    final double NANOSECONDS_IN_MILLISECONDS = 1000000;
    double currentFrameTimeMs = frameTimeNanos / NANOSECONDS_IN_MILLISECONDS;
    if (mSlowAnimationsEnabled) {
      currentFrameTimeMs =
          mFirstUptime + (currentFrameTimeMs - mFirstUptime) / mAnimationsDragFactor;
    }
    return currentFrameTimeMs;
  }
}
