package com.swmansion.worklets;

import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.BundleConsumer;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.fabric.BigStringBufferWrapper;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.soloader.SoLoader;
import com.swmansion.worklets.runloop.AnimationFrameCallback;
import com.swmansion.worklets.runloop.AnimationFrameQueue;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

@SuppressWarnings("JavaJniMissingFunction")
@ReactModule(name = WorkletsModule.NAME)
public class WorkletsModule extends NativeWorkletsModuleSpec
    implements LifecycleEventListener, BundleConsumer {
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
  private final AnimationFrameQueue mAnimationFrameQueue;
  private boolean mSlowAnimationsEnabled;
  private BigStringBufferWrapper mScriptWrapper = null;
  private String mSourceURL = null;

  @Override
  public void setScriptWrapper(BigStringBufferWrapper scriptWrapper) {
    mScriptWrapper = scriptWrapper;
  }

  @Override
  public void setSourceURL(String sourceURL) {
    mSourceURL = sourceURL;
  }

  /**
   * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it doesn't
   * cost us much to add synchronization for extra safety.
   */
  private final AtomicBoolean mInvalidated = new AtomicBoolean(false);

  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybrid(
      long jsContext,
      MessageQueueThread messageQueueThread,
      CallInvokerHolderImpl jsCallInvokerHolder,
      AndroidUIScheduler androidUIScheduler,
      BigStringBufferWrapper scriptWrapper,
      String sourceURL);

  public WorkletsModule(ReactApplicationContext reactContext) {
    super(reactContext);

    if (!BuildConfig.BUNDLE_MODE) {
      reactContext.assertOnJSQueueThread();
    }

    mAndroidUIScheduler = new AndroidUIScheduler(reactContext);
    mAnimationFrameQueue = new AnimationFrameQueue(reactContext);
  }

  @OptIn(markerClass = FrameworkAPI.class)
  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installTurboModule() {
    var context = getReactApplicationContext();

    if (!BuildConfig.BUNDLE_MODE) {
      context.assertOnNativeModulesQueueThread();
    }

    var jsContext = Objects.requireNonNull(context.getJavaScriptContextHolder()).get();
    var jsCallInvokerHolder = JSCallInvokerResolver.getJSCallInvokerHolder(context);

    mHybridData =
        initHybrid(
            jsContext,
            mMessageQueueThread,
            jsCallInvokerHolder,
            mAndroidUIScheduler,
            mScriptWrapper,
            mSourceURL);
    return true;
  }

  public void requestAnimationFrame(AnimationFrameCallback animationFrameCallback) {
    mAnimationFrameQueue.requestAnimationFrame(animationFrameCallback);
  }

  /**
   * @noinspection unused
   */
  @DoNotStrip
  public boolean isOnJSQueueThread() {
    return getReactApplicationContext().isOnJSQueueThread();
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
    if (mHybridData != null && mHybridData.isValid()) {
      // We have to destroy extra runtimes when invalidate is called. If we clean
      // it up later instead there's a chance the runtime will retain references
      // to invalidated memory and will crash on its destruction.
      invalidateCpp();
    }
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
