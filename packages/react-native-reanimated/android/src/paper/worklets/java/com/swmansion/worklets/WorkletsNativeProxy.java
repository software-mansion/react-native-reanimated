package com.swmansion.worklets;

import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.soloader.SoLoader;
import java.util.Objects;

/**
 * @noinspection JavaJniMissingFunction
 */
public class WorkletsNativeProxy extends WorkletsNativeProxyCommon {
  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  static {
    SoLoader.loadLibrary("worklets");
  }

  public @OptIn(markerClass = FrameworkAPI.class) WorkletsNativeProxy(
      ReactApplicationContext context, String valueUnpackerCode) {
    super(context);
    CallInvokerHolderImpl holder =
        (CallInvokerHolderImpl) context.getCatalystInstance().getJSCallInvokerHolder();
    ReanimatedMessageQueueThread messageQueueThread = new ReanimatedMessageQueueThread();
    mHybridData =
        initHybrid(
            Objects.requireNonNull(context.getJavaScriptContextHolder()).get(),
            holder,
            mAndroidUIScheduler,
            messageQueueThread,
            valueUnpackerCode);
  }

  private native HybridData initHybrid(
      long jsContext,
      CallInvokerHolderImpl jsCallInvokerHolder,
      AndroidUIScheduler androidUIScheduler,
      MessageQueueThread messageQueueThread,
      String valueUnpackerCode);

  @Override
  protected HybridData getHybridData() {
    return mHybridData;
  }
}
