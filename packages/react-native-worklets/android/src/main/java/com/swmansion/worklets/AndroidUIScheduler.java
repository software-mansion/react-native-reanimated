package com.swmansion.worklets;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.GuardedRunnable;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UiThreadUtil;
import java.util.concurrent.atomic.AtomicBoolean;

@SuppressWarnings("JavaJniMissingFunction")
public class AndroidUIScheduler {

  @DoNotStrip
  @SuppressWarnings({"unused", "FieldCanBeLocal"})
  private final HybridData mHybridData;

  private final ReactApplicationContext mContext;
  private final AtomicBoolean mActive = new AtomicBoolean(true);

  private final Runnable mUIThreadRunnable =
      () -> {
        // This callback is called on the UI thread, but the module is invalidated on the JS
        // thread. Therefore we must synchronize for reloads. Without synchronization the cpp part
        // gets torn down while the UI thread is still executing it, leading to crashes.
        synchronized (mActive) {
          if (mActive.get()) {
            triggerUI();
          }
        }
      };

  public AndroidUIScheduler(ReactApplicationContext context) {
    mHybridData = initHybrid();
    mContext = context;
  }

  private native HybridData initHybrid();

  public native void triggerUI();

  public native void invalidate();

  @DoNotStrip
  @SuppressWarnings("unused")
  private void scheduleTriggerOnUI() {
    UiThreadUtil.runOnUiThread(
        new GuardedRunnable(mContext.getExceptionHandler()) {
          public void runGuarded() {
            mUIThreadRunnable.run();
          }
        });
  }

  public void deactivate() {
    synchronized (mActive) {
      mActive.set(false);
      invalidate();
    }
  }
}
