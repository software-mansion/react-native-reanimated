package com.swmansion.reanimated;

import android.os.SystemClock;
import androidx.annotation.Nullable;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.JSIModule;
import com.facebook.react.bridge.JavaScriptExecutor;
import com.facebook.react.bridge.JavaScriptExecutorFactory;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.turbomodule.core.interfaces.TurboModuleRegistry;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import com.facebook.hermes.reactexecutor.HermesExecutorFactory;
import com.facebook.react.jscexecutor.JSCExecutorFactory;

public class NativeProxy {

  static {
    System.loadLibrary("reanimated");
  }

  @DoNotStrip
  public static class AnimationFrameCallback implements NodesManager.OnAnimationFrame {

    @DoNotStrip
    private final HybridData mHybridData;

    @DoNotStrip
    private AnimationFrameCallback(HybridData hybridData) {
      mHybridData = hybridData;
    }

    @Override
    public native void onAnimationFrame(double timestampMs);
  }

  @DoNotStrip
  public static class EventHandler implements RCTEventEmitter {

    @DoNotStrip
    private final HybridData mHybridData;
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
    public void receiveTouches(String eventName, WritableArray touches, WritableArray changedIndices) {
      // not interested in processing touch events this way, we process raw events only
    }
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;
  private NodesManager mNodesManager;
  private final WeakReference<ReactApplicationContext> mContext;
  private JavaScriptExecutor mJavaScriptExecutor;

  public NativeProxy(ReactApplicationContext context) {
    try {
      mJavaScriptExecutor = new HermesExecutorFactory().create();
      //mJavaScriptExecutor = new JSCExecutorFactory("Reanimated", "Reanimated").create();
    } catch (Exception jscE) {
      try {
        mJavaScriptExecutor = new HermesExecutorFactory().create();
      } catch (UnsatisfiedLinkError hermesE) {
        hermesE.printStackTrace();
      }
    }

    //try {
      //mJavaScriptExecutor = new HermesExecutorFactory().create();
      //JavaScriptExecutor tmp2 = new JSCExecutorFactory("Reanimated", "Reanimated").create();
      //tmp2.getName();
      //mJavaScriptExecutor.getName();
    //} catch (Exception e) {}
    CallInvokerHolderImpl holder = (CallInvokerHolderImpl)context.getCatalystInstance().getJSCallInvokerHolder();
    mHybridData = initHybrid(context.getJavaScriptContextHolder().get(), holder, new Scheduler(context), mJavaScriptExecutor);
    mContext = new WeakReference<>(context);
    prepare();
  }

  private native HybridData initHybrid(long jsContext, CallInvokerHolderImpl jsCallInvokerHolder, Scheduler scheduler, JavaScriptExecutor mJavaScriptExecutor);
  private native void installJSIBindings();

  public native boolean isAnyHandlerWaitingForEvent(String eventName);

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

  public void onCatalystInstanceDestroy() {
    mHybridData.resetNative();
    mJavaScriptExecutor.close();
  }

  public void prepare() {
    mNodesManager = mContext.get().getNativeModule(ReanimatedModule.class).getNodesManager();
    installJSIBindings();
  }
}
