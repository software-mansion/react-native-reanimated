package com.swmansion.worklets;

import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.RuntimeExecutor;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.soloader.SoLoader;
import com.swmansion.reanimated.NativeWorkletsModuleSpec;
import java.util.Objects;

@ReactModule(name = WorkletsModule.NAME)
public class WorkletsModule extends NativeWorkletsModuleSpec {
  static {
    SoLoader.loadLibrary("worklets");
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private HybridData mHybridData;

  /**
   * @noinspection unused
   */
  protected HybridData getHybridData() {
    return mHybridData;
  }

  /**
   * @noinspection JavaJniMissingFunction
   */
  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybrid(
      long jsContext,
      CallInvokerHolderImpl jsCallInvokerHolder,
      AndroidUIScheduler androidUIScheduler,
      MessageQueueThread messageQueueThread,
      String valueUnpackerCode);

  /**
   * @noinspection JavaJniMissingFunction
   */
  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybridBridgeless(
      long jsContext,
      RuntimeExecutor runtimeExecutor,
      AndroidUIScheduler androidUIScheduler,
      MessageQueueThread messageQueueThread,
      String valueUnpackerCode);

  private final AndroidUIScheduler mAndroidUIScheduler;

  public WorkletsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    mAndroidUIScheduler = new AndroidUIScheduler(reactContext);
  }

  /**
   * @noinspection JavaJniMissingFunction
   */
  protected native void installJSIBindings();

  public AndroidUIScheduler getAndroidUIScheduler() {
    return mAndroidUIScheduler;
  }

  @Override
  public void initialize() {
    // Do nothing.
  }

  @OptIn(markerClass = FrameworkAPI.class)
  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installTurboModule(String valueUnpackerCode) {
    var context = getReactApplicationContext();
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

    return true;
  }

  @Override
  public void invalidate() {
    super.invalidate();
    mAndroidUIScheduler.deactivate();
  }
}
