package com.swmansion.reanimated;

import android.content.ContentResolver;
import android.os.SystemClock;
import android.provider.Settings;
import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.common.UIManagerType;
import com.facebook.soloader.SoLoader;
import com.swmansion.common.GestureHandlerStateManager;
import com.swmansion.reanimated.keyboard.KeyboardAnimationManager;
import com.swmansion.reanimated.keyboard.KeyboardWorkletWrapper;
import com.swmansion.reanimated.nativeProxy.AnimationFrameCallback;
import com.swmansion.reanimated.nativeProxy.EventHandler;
import com.swmansion.reanimated.nativeProxy.SensorSetter;
import com.swmansion.reanimated.sensor.ReanimatedSensorContainer;
import com.swmansion.reanimated.sensor.ReanimatedSensorType;
import com.swmansion.worklets.JSCallInvokerResolver;
import com.swmansion.worklets.WorkletsModule;
import java.lang.ref.WeakReference;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * @noinspection JavaJniMissingFunction
 */
public class NativeProxy {
  static {
    SoLoader.loadLibrary("reanimated");
  }

  protected final WorkletsModule mWorkletsModule;
  protected NodesManager mNodesManager;
  protected final WeakReference<ReactApplicationContext> mContext;
  private final ReanimatedSensorContainer reanimatedSensorContainer;
  private final GestureHandlerStateManager gestureHandlerStateManager;
  private final KeyboardAnimationManager keyboardAnimationManager;
  private Long firstUptime = SystemClock.uptimeMillis();
  private boolean slowAnimationsEnabled = false;
  private final int ANIMATIONS_DRAG_FACTOR = 10;
  protected String cppVersion = null;

  /**
   * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it doesn't
   * cost us much to add synchronization for extra safety.
   */
  private final AtomicBoolean mInvalidated = new AtomicBoolean(false);

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  public @OptIn(markerClass = FrameworkAPI.class) NativeProxy(
      ReactApplicationContext context, WorkletsModule workletsModule, NodesManager nodesManager) {
    context.assertOnJSQueueThread();

    mWorkletsModule = workletsModule;
    mContext = new WeakReference<>(context);
    reanimatedSensorContainer = new ReanimatedSensorContainer(mContext);
    keyboardAnimationManager = new KeyboardAnimationManager(mContext);
    addDevMenuOption();

    GestureHandlerStateManager tempHandlerStateManager;
    try {
      Class<NativeModule> gestureHandlerModuleClass =
          (Class<NativeModule>)
              Class.forName("com.swmansion.gesturehandler.react.RNGestureHandlerModule");
      tempHandlerStateManager =
          (GestureHandlerStateManager) context.getNativeModule(gestureHandlerModuleClass);
    } catch (ClassCastException | ClassNotFoundException e) {
      tempHandlerStateManager = null;
    }
    gestureHandlerStateManager = tempHandlerStateManager;
    mNodesManager = nodesManager;

    FabricUIManager fabricUIManager =
        (FabricUIManager) UIManagerHelper.getUIManager(context, UIManagerType.FABRIC);

    CallInvokerHolderImpl callInvokerHolder = JSCallInvokerResolver.getJSCallInvokerHolder(context);
    mHybridData =
        initHybrid(
            workletsModule,
            Objects.requireNonNull(context.getJavaScriptContextHolder()).get(),
            callInvokerHolder,
            fabricUIManager);
    if (BuildConfig.DEBUG) {
      checkCppVersion(); // injectCppVersion should be called during initHybrid above
    }
  }

  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybrid(
      WorkletsModule workletsModule,
      long jsContext,
      CallInvokerHolderImpl jsCallInvokerHolder,
      FabricUIManager fabricUIManager);

  public native boolean isAnyHandlerWaitingForEvent(String eventName, int emitterReactTag);

  public native void performOperations();

  protected native void installJSIBindings();

  private native void invalidateCpp();

  protected HybridData getHybridData() {
    return mHybridData;
  }

  protected void invalidate() {
    if (mInvalidated.getAndSet(true)) {
      return;
    }
    if (mHybridData != null && mHybridData.isValid()) {
      invalidateCpp();
    }
  }

  private void toggleSlowAnimations() {
    slowAnimationsEnabled = !slowAnimationsEnabled;
    if (slowAnimationsEnabled) {
      firstUptime = SystemClock.uptimeMillis();
    }
    mNodesManager.enableSlowAnimations(slowAnimationsEnabled, ANIMATIONS_DRAG_FACTOR);
    mWorkletsModule.toggleSlowAnimations();
  }

  private void addDevMenuOption() {
    // In Expo, `ApplicationContext` is not an instance of `ReactApplication`
    DevMenuUtils.addDevMenuOption(mContext.get(), this::toggleSlowAnimations);
  }

  @DoNotStrip
  public void requestRender(AnimationFrameCallback callback) {
    UiThreadUtil.assertOnUiThread();
    mNodesManager.postOnAnimation(callback);
  }

  @DoNotStrip
  public String getReanimatedJavaVersion() {
    return BuildConfig.REANIMATED_VERSION_JAVA;
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  // It turns out it's pretty difficult to set a member of a class
  // instance through JNI so we decided to use a setter instead.
  protected void setCppVersion(String version) {
    cppVersion = version;
  }

  protected void checkCppVersion() {
    if (cppVersion == null) {
      throw new RuntimeException(
          "[Reanimated] Java side failed to resolve C++ code version. "
              + "See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#java-side-failed-to-resolve-c-code-version for more information.");
    }
    String javaVersion = getReanimatedJavaVersion();
    if (!cppVersion.equals(javaVersion)) {
      throw new RuntimeException(
          "[Reanimated] Mismatch between Java code version and C++ code version ("
              + javaVersion
              + " vs. "
              + cppVersion
              + " respectively). See "
              + "https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#mismatch-between-java-code-version-and-c-code-version for more information.");
    }
  }

  @DoNotStrip
  public void setGestureState(int handlerTag, int newState) {
    if (gestureHandlerStateManager != null) {
      gestureHandlerStateManager.setGestureHandlerState(handlerTag, newState);
    }
  }

  @DoNotStrip
  public long getAnimationTimestamp() {
    if (slowAnimationsEnabled) {
      return this.firstUptime
          + (SystemClock.uptimeMillis() - this.firstUptime) / ANIMATIONS_DRAG_FACTOR;
    } else {
      return SystemClock.uptimeMillis();
    }
  }

  @DoNotStrip
  public void registerEventHandler(EventHandler handler) {
    handler.mCustomEventNamesResolver = mNodesManager.getEventNameResolver();
    mNodesManager.registerEventHandler(handler);
  }

  @DoNotStrip
  public int registerSensor(int sensorType, int interval, SensorSetter setter) {
    return reanimatedSensorContainer.registerSensor(
        ReanimatedSensorType.getInstanceById(sensorType), interval, setter);
  }

  @DoNotStrip
  public void unregisterSensor(int sensorId) {
    reanimatedSensorContainer.unregisterSensor(sensorId);
  }

  @DoNotStrip
  public int subscribeForKeyboardEvents(
      KeyboardWorkletWrapper keyboardWorkletWrapper,
      boolean isStatusBarTranslucent,
      boolean isNavigationBarTranslucent) {
    return keyboardAnimationManager.subscribeForKeyboardUpdates(
        keyboardWorkletWrapper, isStatusBarTranslucent, isNavigationBarTranslucent);
  }

  @DoNotStrip
  public void unsubscribeFromKeyboardEvents(int listenerId) {
    keyboardAnimationManager.unsubscribeFromKeyboardUpdates(listenerId);
  }

  @DoNotStrip
  public boolean getIsReducedMotion() {
    ContentResolver mContentResolver = mContext.get().getContentResolver();
    String rawValue =
        Settings.Global.getString(mContentResolver, Settings.Global.TRANSITION_ANIMATION_SCALE);
    float parsedValue = rawValue != null ? Float.parseFloat(rawValue) : 1f;
    return parsedValue == 0f;
  }

  @DoNotStrip
  void maybeFlushUIUpdatesQueue() {
    UiThreadUtil.assertOnUiThread();
    if (!mNodesManager.isAnimationRunning()) {
      mNodesManager.performOperations();
    }
  }
}
