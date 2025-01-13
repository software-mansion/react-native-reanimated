package com.swmansion.worklets;

import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.soloader.SoLoader;
import com.swmansion.reanimated.NativeWorkletsModuleSpec;
import java.util.Objects;

/**
 * @noinspection JavaJniMissingFunction
 */
@ReactModule(name = WorkletsModule.NAME)
public class WorkletsModule extends NativeWorkletsModuleSpec {
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

  private final WorkletsMessageQueueThread mMessageQueueThread = new WorkletsMessageQueueThread();
  private final AndroidUIScheduler mAndroidUIScheduler;

  public AndroidUIScheduler getAndroidUIScheduler() {
    return mAndroidUIScheduler;
  }

  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybrid(
      long jsContext,
      String valueUnpackerCode,
      MessageQueueThread messageQueueThread,
      CallInvokerHolderImpl jsCallInvokerHolder,
      AndroidUIScheduler androidUIScheduler);

  public WorkletsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    mAndroidUIScheduler = new AndroidUIScheduler(reactContext);
  }

  @OptIn(markerClass = FrameworkAPI.class)
  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installTurboModule(String valueUnpackerCode) {
    var context = getReactApplicationContext();
    var jsContext = Objects.requireNonNull(context.getJavaScriptContextHolder()).get();
    var jsCallInvokerHolder = JSCallInvokerResolver.getJSCallInvokerHolder(context);

    mHybridData =
        initHybrid(
            jsContext,
            valueUnpackerCode,
            mMessageQueueThread,
            jsCallInvokerHolder,
            mAndroidUIScheduler);
    return true;
  }

  public void invalidate() {
    // We have to destroy extra runtimes when invalidate is called. If we clean
    // it up later instead there's a chance the runtime will retain references
    // to invalidated memory and will crash on its destruction.
    invalidateCpp();

    mAndroidUIScheduler.deactivate();
  }

  private native void invalidateCpp();
}
