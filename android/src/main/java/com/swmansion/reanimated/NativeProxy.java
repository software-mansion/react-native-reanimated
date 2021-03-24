package com.swmansion.reanimated;

import android.os.SystemClock;
import androidx.annotation.Nullable;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.JavaScriptExecutor;
import com.facebook.react.bridge.JavaScriptExecutorFactory;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import java.lang.ref.WeakReference;
import java.util.Map;

import com.facebook.hermes.reactexecutor.HermesExecutorFactory;
import com.facebook.react.jscexecutor.JSCExecutorFactory;
import com.facebook.soloader.SoLoader;

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
  private Scheduler mScheduler = null;

  public NativeProxy(ReactApplicationContext context) {
    try {
      mJavaScriptExecutor = getDefaultJSExecutorFactory(context).create();
    } catch (Exception jscE) {
      jscE.printStackTrace();
    }

    CallInvokerHolderImpl holder = (CallInvokerHolderImpl)context.getCatalystInstance().getJSCallInvokerHolder();
    mScheduler = new Scheduler(context);
    mHybridData = initHybrid(context.getJavaScriptContextHolder().get(), holder, mScheduler, mJavaScriptExecutor);
    mContext = new WeakReference<>(context);
    prepare();
  }

  // method from React native
  private JavaScriptExecutorFactory getDefaultJSExecutorFactory(ReactApplicationContext context) {
    try {
      // If JSC is included, use it as normal
      SoLoader.init(context, /* native exopackage */ false);
      SoLoader.loadLibrary("jscexecutor");
      return new JSCExecutorFactory("Reanimated", "Reanimated");
    } catch (UnsatisfiedLinkError jscE) {
      // https://github.com/facebook/hermes/issues/78 shows that
      // people who aren't trying to use Hermes are having issues.
      // https://github.com/facebook/react-native/issues/25923#issuecomment-554295179
      // includes the actual JSC error in at least one case.
      //
      // So, if "__cxa_bad_typeid" shows up in the jscE exception
      // message, then we will assume that's the failure and just
      // throw now.

      if (jscE.getMessage().contains("__cxa_bad_typeid")) {
        throw jscE;
      }

      // Otherwise use Hermes
      try {
        return new HermesExecutorFactory();
      } catch (UnsatisfiedLinkError hermesE) {
        // If we get here, either this is a JSC build, and of course
        // Hermes failed (since it's not in the APK), or it's a Hermes
        // build, and Hermes had a problem.

        // We suspect this is a JSC issue (it's the default), so we
        // will throw that exception, but we will print hermesE first,
        // since it could be a Hermes issue and we don't want to
        // swallow that.
        hermesE.printStackTrace();
        throw jscE;
      }
    }
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
    mScheduler.deactivate();
    mHybridData.resetNative();
    mJavaScriptExecutor.close();
  }

  public void prepare() {
    mNodesManager = mContext.get().getNativeModule(ReanimatedModule.class).getNodesManager();
    installJSIBindings();
  }
}
