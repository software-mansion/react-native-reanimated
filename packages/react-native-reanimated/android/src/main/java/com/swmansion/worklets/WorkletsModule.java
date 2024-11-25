package com.swmansion.worklets;

import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.soloader.SoLoader;
import com.swmansion.reanimated.NativeWorkletsModuleSpec;
import com.swmansion.reanimated.ReanimatedMessageQueueThread;
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

  private final ReanimatedMessageQueueThread mMessageQueueThread =
      new ReanimatedMessageQueueThread();

  /**
   * @noinspection JavaJniMissingFunction
   */
  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybrid(
      long jsContext, String valueUnpackerCode, MessageQueueThread messageQueueThread);

  public WorkletsModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @OptIn(markerClass = FrameworkAPI.class)
  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installTurboModule(String valueUnpackerCode) {
    var context = getReactApplicationContext();
    var jsContext = Objects.requireNonNull(context.getJavaScriptContextHolder()).get();

    mHybridData = initHybrid(jsContext, valueUnpackerCode, mMessageQueueThread);

    return true;
  }
}
