package com.swmansion.reanimated;

import android.os.SystemClock;
import android.util.Log;
import androidx.annotation.Nullable;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.swmansion.common.GestureHandlerStateManager;
import com.swmansion.reanimated.layoutReanimation.AnimationsManager;
import com.swmansion.reanimated.layoutReanimation.LayoutAnimations;
import com.swmansion.reanimated.layoutReanimation.NativeMethodsHolder;
import com.swmansion.reanimated.sensor.ReanimatedSensorContainer;

import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Map;
import java.util.function.BiConsumer;
import android.hardware.SensorManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Map;

public class NativeProxy {

  static {
    System.loadLibrary("reanimated");
  }

  @DoNotStrip
  public static class AnimationFrameCallback implements NodesManager.OnAnimationFrame {

    @DoNotStrip private final HybridData mHybridData;

    @DoNotStrip
    private AnimationFrameCallback(HybridData hybridData) {
      mHybridData = hybridData;
    }

    @Override
    public native void onAnimationFrame(double timestampMs);
  }

  @DoNotStrip
  public static class EventHandler implements RCTEventEmitter {

    @DoNotStrip private final HybridData mHybridData;
    private UIManagerModule.CustomEventNamesResolver mCustomEventNamesResolver;

    @DoNotStrip
    private EventHandler(HybridData hybridData) {
      mHybridData = hybridData;
    }

    @Override
    public void receiveEvent(int targetTag, String eventName, @Nullable WritableMap event) {
      String resolvedEventName = mCustomEventNamesResolver.resolveCustomEventName(eventName);
      receiveEvent(targetTag + resolvedEventName, event);
    }

    public native void receiveEvent(String eventKey, @Nullable WritableMap event);

    @Override
    public void receiveTouches(
        String eventName, WritableArray touches, WritableArray changedIndices) {
      // not interested in processing touch events this way, we process raw events only
    }
  }

  @DoNotStrip
  public static class SensorSetter {

    @DoNotStrip
    private final HybridData mHybridData;

    @DoNotStrip
    private SensorSetter(HybridData hybridData) {
      mHybridData = hybridData;
    }

    public native void sensorSetter(double value);
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  private NodesManager mNodesManager;
  private final WeakReference<ReactApplicationContext> mContext;
  private Scheduler mScheduler = null;
  private ReanimatedSensorContainer reanimatedSensorContainer;
  private final GestureHandlerStateManager gestureHandlerStateManager;

  public NativeProxy(ReactApplicationContext context) {
    CallInvokerHolderImpl holder =
        (CallInvokerHolderImpl) context.getCatalystInstance().getJSCallInvokerHolder();
    LayoutAnimations LayoutAnimations = new LayoutAnimations(context);
    mScheduler = new Scheduler(context);
    mHybridData =
        initHybrid(
            context.getJavaScriptContextHolder().get(), holder, mScheduler, LayoutAnimations);
    mContext = new WeakReference<>(context);
    prepare(LayoutAnimations);
    reanimatedSensorContainer = new ReanimatedSensorContainer(mContext);

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
  }

  private native HybridData initHybrid(
      long jsContext,
      CallInvokerHolderImpl jsCallInvokerHolder,
      Scheduler scheduler,
      LayoutAnimations LayoutAnimations);

  private native void installJSIBindings();

  public native boolean isAnyHandlerWaitingForEvent(String eventName);

  public Scheduler getScheduler() {
    return mScheduler;
  }

  @DoNotStrip
  private void requestRender(AnimationFrameCallback callback) {
    mNodesManager.postOnAnimation(callback);
  }

  @DoNotStrip
  private void updateProps(int viewTag, Map<String, Object> props) {
    mNodesManager.updateProps(viewTag, props);
  }

  @DoNotStrip
  private String obtainProp(int viewTag, String propName) {
    return mNodesManager.obtainProp(viewTag, propName);
  }

  @DoNotStrip
  private void scrollTo(int viewTag, double x, double y, boolean animated) {
    mNodesManager.scrollTo(viewTag, x, y, animated);
  }

  @DoNotStrip
  private void setGestureState(int handlerTag, int newState) {
    if (gestureHandlerStateManager != null) {
      gestureHandlerStateManager.setGestureHandlerState(handlerTag, newState);
    }
  }

  @DoNotStrip
  private String getUpTime() {
    return Long.toString(SystemClock.uptimeMillis());
  }

  @DoNotStrip
  private float[] measure(int viewTag) {
    return mNodesManager.measure(viewTag);
  }

  @DoNotStrip
  private void registerEventHandler(EventHandler handler) {
    handler.mCustomEventNamesResolver = mNodesManager.getEventNameResolver();
    mNodesManager.registerEventHandler(handler);
  }

  static class SensorListener implements SensorEventListener {
    public static float value;
    @Override
    public void onSensorChanged(SensorEvent event) {
      value = event.values[0];
      System.out.println(event.values[0]);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {

    }
  }
  SensorListener listener = new SensorListener();
  boolean isInit = false;
  SensorManager sensorManager;
  Sensor sensor;

  @DoNotStrip
  private float[] getSensorData(int sensorType) {
    //TODO
    if(!isInit) {
      sensorManager = (SensorManager)mContext.get().getSystemService(mContext.get().SENSOR_SERVICE);
      sensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
      sensorManager.registerListener(listener, sensor, 2 * 1000);
    }
    float[] result = new float [1];
    result[0] = SensorListener.value;
    return result;
  }

  @DoNotStrip
  private int registerSensor(int sensorType, int interval, SensorSetter setter) {
    return reanimatedSensorContainer.registerSensor(sensorType, interval, setter);
  }

  @DoNotStrip
  private void rejectSensor(int sensorId) {
    reanimatedSensorContainer.rejectSensor(sensorId);
  }

  public void onCatalystInstanceDestroy() {
    mScheduler.deactivate();
    mHybridData.resetNative();
  }

  public void prepare(LayoutAnimations LayoutAnimations) {
    if (Utils.isChromeDebugger) {
      Log.w("[REANIMATED]", "You can not use LayoutAnimation with enabled Chrome Debugger");
      return;
    }
    mNodesManager = mContext.get().getNativeModule(ReanimatedModule.class).getNodesManager();
    installJSIBindings();
    AnimationsManager animationsManager =
        mContext
            .get()
            .getNativeModule(ReanimatedModule.class)
            .getNodesManager()
            .getAnimationsManager();

    WeakReference<LayoutAnimations> weakLayoutAnimations = new WeakReference<>(LayoutAnimations);
    animationsManager.setNativeMethods(
        new NativeMethodsHolder() {
          @Override
          public void startAnimationForTag(int tag, String type, HashMap<String, Float> values) {
            LayoutAnimations LayoutAnimations = weakLayoutAnimations.get();
            if (LayoutAnimations != null) {
              HashMap<String, String> preparedValues = new HashMap<>();
              for (String key : values.keySet()) {
                preparedValues.put(key, values.get(key).toString());
              }
              LayoutAnimations.startAnimationForTag(tag, type, preparedValues);
            }
          }

          @Override
          public void removeConfigForTag(int tag) {
            LayoutAnimations LayoutAnimations = weakLayoutAnimations.get();
            if (LayoutAnimations != null) {
              LayoutAnimations.removeConfigForTag(tag);
            }
          }

          @Override
          public boolean isLayoutAnimationEnabled() {
            return LayoutAnimations.isLayoutAnimationEnabled();
          }
        });
  }
}
