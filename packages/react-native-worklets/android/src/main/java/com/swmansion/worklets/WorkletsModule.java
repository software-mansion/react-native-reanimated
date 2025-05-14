package com.swmansion.worklets;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.interfaces.BindingsInstallerHolder;
import com.facebook.react.turbomodule.core.interfaces.TurboModuleWithJSIBindings;
import com.facebook.soloader.SoLoader;
import com.swmansion.worklets.runloop.AnimationFrameCallback;
import com.swmansion.worklets.runloop.AnimationFrameQueue;
import java.util.concurrent.atomic.AtomicBoolean;

@SuppressWarnings("JavaJniMissingFunction")
@ReactModule(name = WorkletsModule.NAME)
public class WorkletsModule extends NativeWorkletsModuleSpec
    implements LifecycleEventListener, TurboModuleWithJSIBindings {
  static {
    SoLoader.loadLibrary("worklets");
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private HybridData mHybridData;

  @SuppressWarnings("unused")
  protected HybridData getHybridData() {
    return mHybridData;
  }

  private final AndroidUIScheduler mAndroidUIScheduler;
  private final AnimationFrameQueue mAnimationFrameQueue;
  private boolean mSlowAnimationsEnabled;

  /**
   * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it doesn't
   * cost us much to add synchronization for extra safety.
   */
  private final AtomicBoolean mInvalidated = new AtomicBoolean(false);

  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybrid(
      MessageQueueThread messageQueueThread, AndroidUIScheduler androidUIScheduler);

  @OptIn(markerClass = FrameworkAPI.class)
  public WorkletsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    reactContext.assertOnJSQueueThread();

    mAnimationFrameQueue = new AnimationFrameQueue(reactContext);

    WorkletsMessageQueueThread messageQueueThread = new WorkletsMessageQueueThread();
    mAndroidUIScheduler = new AndroidUIScheduler(reactContext);
    mHybridData = initHybrid(messageQueueThread, mAndroidUIScheduler);
  }

  @NonNull
  @Override
  public native BindingsInstallerHolder getBindingsInstaller();

  public void requestAnimationFrame(AnimationFrameCallback animationFrameCallback) {
    mAnimationFrameQueue.requestAnimationFrame(animationFrameCallback);
  }

  public void toggleSlowAnimations() {
    final int ANIMATIONS_DRAG_FACTOR = 10;
    mSlowAnimationsEnabled = !mSlowAnimationsEnabled;
    mAnimationFrameQueue.enableSlowAnimations(mSlowAnimationsEnabled, ANIMATIONS_DRAG_FACTOR);
  }

  public void invalidate() {
    if (mInvalidated.getAndSet(true)) {
      return;
    }
    invalidateCpp();
    mAndroidUIScheduler.deactivate();
  }

  private native void invalidateCpp();

  @Override
  public void onHostResume() {
    mAnimationFrameQueue.resume();
  }

  @Override
  public void onHostPause() {
    mAnimationFrameQueue.pause();
  }

  @Override
  public void onHostDestroy() {}
}
