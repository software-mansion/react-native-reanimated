package com.swmansion.reanimated;

import android.content.ContentResolver;
import android.os.SystemClock;
import android.provider.Settings;
import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.JavaOnlyArray;
import com.facebook.react.bridge.JavaOnlyMap;
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
import java.util.Arrays;
import java.util.Objects;
import java.util.PrimitiveIterator;
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
  protected final FabricUIManager mFabricUIManager;
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

    mFabricUIManager =
        (FabricUIManager) UIManagerHelper.getUIManager(context, UIManagerType.FABRIC);

    CallInvokerHolderImpl callInvokerHolder = JSCallInvokerResolver.getJSCallInvokerHolder(context);
    mHybridData =
        initHybrid(
            workletsModule,
            Objects.requireNonNull(context.getJavaScriptContextHolder()).get(),
            callInvokerHolder,
            mFabricUIManager);
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

  // NOTE: Keep in sync with ReanimatedModuleProxy::performOperations
  private static final int CMD_START_OF_VIEW = 1;
  private static final int CMD_START_OF_TRANSFORM = 2;
  private static final int CMD_END_OF_TRANSFORM = 3;
  private static final int CMD_END_OF_VIEW = 4;
  private static final int CMD_OPACITY = 10;
  private static final int CMD_BORDER_RADIUS = 11;
  private static final int CMD_BACKGROUND_COLOR = 12;
  private static final int CMD_BORDER_COLOR = 13;
  private static final int CMD_COLOR = 14;
  private static final int CMD_TRANSFORM_TRANSLATE_X = 100;
  private static final int CMD_TRANSFORM_TRANSLATE_Y = 101;
  private static final int CMD_TRANSFORM_SCALE = 102;
  private static final int CMD_TRANSFORM_SCALE_X = 103;
  private static final int CMD_TRANSFORM_SCALE_Y = 104;
  private static final int CMD_TRANSFORM_ROTATE = 105;
  private static final int CMD_TRANSFORM_ROTATE_X = 106;
  private static final int CMD_TRANSFORM_ROTATE_Y = 107;
  private static final int CMD_TRANSFORM_ROTATE_Z = 108;
  private static final int CMD_TRANSFORM_SKEW_X = 109;
  private static final int CMD_TRANSFORM_SKEW_Y = 110;
  private static final int CMD_TRANSFORM_MATRIX = 111;
  private static final int CMD_TRANSFORM_PERSPECTIVE = 112;
  private static final int CMD_UNIT_DEG = 200;
  private static final int CMD_UNIT_RAD = 201;
  private static final int CMD_UNIT_PX = 202;
  private static final int CMD_UNIT_PERCENT = 203;

  private static String commandToString(int command) {
    return switch (command) {
      case CMD_OPACITY -> "opacity";
      case CMD_BORDER_RADIUS -> "borderRadius";
      case CMD_BACKGROUND_COLOR -> "backgroundColor";
      case CMD_BORDER_COLOR -> "borderColor";
      case CMD_COLOR -> "color";
      default -> throw new RuntimeException("Unknown command: " + command);
    };
  }

  private static String transformCommandToString(int transformCommand) {
    return switch (transformCommand) {
      case CMD_TRANSFORM_TRANSLATE_X -> "translateX";
      case CMD_TRANSFORM_TRANSLATE_Y -> "translateY";
      case CMD_TRANSFORM_SCALE -> "scale";
      case CMD_TRANSFORM_SCALE_X -> "scaleX";
      case CMD_TRANSFORM_SCALE_Y -> "scaleY";
      case CMD_TRANSFORM_ROTATE -> "rotate";
      case CMD_TRANSFORM_ROTATE_X -> "rotateX";
      case CMD_TRANSFORM_ROTATE_Y -> "rotateY";
      case CMD_TRANSFORM_ROTATE_Z -> "rotateZ";
      case CMD_TRANSFORM_SKEW_X -> "skewX";
      case CMD_TRANSFORM_SKEW_Y -> "skewY";
      case CMD_TRANSFORM_MATRIX -> "matrix";
      case CMD_TRANSFORM_PERSPECTIVE -> "perspective";
      default -> throw new RuntimeException("Unknown transform command: " + transformCommand);
    };
  }

  @DoNotStrip
  public void synchronouslyUpdateUIProps(int[] intBuffer, double[] doubleBuffer) {
    PrimitiveIterator.OfInt intIterator = Arrays.stream(intBuffer).iterator();
    PrimitiveIterator.OfDouble doubleIterator = Arrays.stream(doubleBuffer).iterator();
    int viewTag = -1;
    JavaOnlyMap props = new JavaOnlyMap();
    while (intIterator.hasNext()) {
      int command = intIterator.nextInt();
      switch (command) {
        case CMD_START_OF_VIEW:
          viewTag = intIterator.nextInt();
          props = new JavaOnlyMap();
          break;

        case CMD_OPACITY:
        case CMD_BORDER_RADIUS:
          {
            String name = commandToString(command);
            props.putDouble(name, doubleIterator.nextDouble());
            break;
          }

        case CMD_BACKGROUND_COLOR:
        case CMD_BORDER_COLOR:
        case CMD_COLOR:
          {
            String name = commandToString(command);
            props.putInt(name, intIterator.nextInt());
            break;
          }

        case CMD_START_OF_TRANSFORM:
          JavaOnlyArray transform = new JavaOnlyArray();
          while (true) {
            int transformCommand = intIterator.nextInt();
            if (transformCommand == CMD_END_OF_TRANSFORM) {
              props.putArray("transform", transform);
              break;
            }
            String name = transformCommandToString(transformCommand);
            switch (transformCommand) {
              case CMD_TRANSFORM_TRANSLATE_X:
              case CMD_TRANSFORM_TRANSLATE_Y:
                {
                  double value = doubleIterator.nextDouble();
                  switch (intIterator.nextInt()) {
                    case CMD_UNIT_PX -> transform.pushMap(JavaOnlyMap.of(name, value));
                    case CMD_UNIT_PERCENT -> transform.pushMap(JavaOnlyMap.of(name, value + "%"));
                    default -> throw new RuntimeException("Unknown unit command");
                  }
                  break;
                }

              case CMD_TRANSFORM_SCALE:
              case CMD_TRANSFORM_SCALE_X:
              case CMD_TRANSFORM_SCALE_Y:
              case CMD_TRANSFORM_PERSPECTIVE:
                {
                  double value = doubleIterator.nextDouble();
                  transform.pushMap(JavaOnlyMap.of(name, value));
                  break;
                }

              case CMD_TRANSFORM_ROTATE:
              case CMD_TRANSFORM_ROTATE_X:
              case CMD_TRANSFORM_ROTATE_Y:
              case CMD_TRANSFORM_ROTATE_Z:
              case CMD_TRANSFORM_SKEW_X:
              case CMD_TRANSFORM_SKEW_Y:
                double angle = doubleIterator.nextDouble();
                String unit =
                    switch (intIterator.nextInt()) {
                      case CMD_UNIT_DEG -> "deg";
                      case CMD_UNIT_RAD -> "rad";
                      default -> throw new RuntimeException("Unknown unit command");
                    };
                transform.pushMap(JavaOnlyMap.of(name, angle + unit));
                break;

              case CMD_TRANSFORM_MATRIX:
                int length = intIterator.nextInt();
                JavaOnlyArray matrix = new JavaOnlyArray();
                for (int i = 0; i < length; i++) {
                  matrix.pushDouble(doubleIterator.nextDouble());
                }
                transform.pushMap(JavaOnlyMap.of(name, matrix));
                break;

              default:
                throw new RuntimeException("Unknown transform type: " + transformCommand);
            }
          }
          break;

        case CMD_END_OF_VIEW:
          mFabricUIManager.synchronouslyUpdateViewOnUIThread(viewTag, props);
          break;

        default:
          throw new RuntimeException("Unexcepted command: " + command);
      }
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
