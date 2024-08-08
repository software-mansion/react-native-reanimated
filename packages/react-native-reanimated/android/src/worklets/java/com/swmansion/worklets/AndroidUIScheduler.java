package com.swmansion.worklets;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.GuardedRunnable;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.soloader.SoLoader;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * @noinspection JavaJniMissingFunction
 */
public class AndroidUIScheduler {
  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  static {
    SoLoader.loadLibrary("worklets");
  }

  private final ReactApplicationContext mContext;
  private final AtomicBoolean mActive = new AtomicBoolean(true);

  private final Runnable mUIThreadRunnable =
      () -> {
        if (mActive.get()) {
          triggerUI();
        }
      };

  public AndroidUIScheduler(ReactApplicationContext context) {
    mHybridData = initHybrid();
    mContext = context;
  }

  private native HybridData initHybrid();

  public native void triggerUI();

  @DoNotStrip
  private void scheduleTriggerOnUI() {
    UiThreadUtil.runOnUiThread(
        new GuardedRunnable(mContext.getExceptionHandler()) {
          public void runGuarded() {
            mUIThreadRunnable.run();
          }
        });
  }

  public void deactivate() {
    mActive.set(false);
  }
}
