package com.swmansion.worklets;

import android.content.ContentResolver;
import android.provider.Settings;
import com.facebook.jni.HybridData;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.soloader.SoLoader;
import java.lang.ref.WeakReference;

public abstract class WorkletsNativeProxyCommon {
  static {
    SoLoader.loadLibrary("worklets");
  }

  protected final WeakReference<ReactApplicationContext> mContext;
  protected AndroidUIScheduler mAndroidUIScheduler;

  protected WorkletsNativeProxyCommon(ReactApplicationContext context) {
    mAndroidUIScheduler = new AndroidUIScheduler(context);
    mContext = new WeakReference<>(context);
  }

  protected native void installJSIBindings();

  public AndroidUIScheduler getAndroidUIScheduler() {
    return mAndroidUIScheduler;
  }

  /**
   * @noinspection unused
   */
  protected abstract HybridData getHybridData();

  public void invalidate() {
    mAndroidUIScheduler.deactivate();
  }

  // @DoNotStrip
  public boolean getIsReducedMotion() {
    ContentResolver mContentResolver = mContext.get().getContentResolver();
    String rawValue =
        Settings.Global.getString(mContentResolver, Settings.Global.TRANSITION_ANIMATION_SCALE);
    float parsedValue = rawValue != null ? Float.parseFloat(rawValue) : 1f;
    return parsedValue == 0f;
  }
}
