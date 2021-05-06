package com.swmansion.reanimated;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.os.SystemClock;
import androidx.annotation.Nullable;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.ReactInstanceManagerBuilder;
import com.facebook.react.bridge.JavaScriptExecutor;
import com.facebook.react.bridge.JavaScriptExecutorFactory;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.bridge.queue.QueueThreadExceptionHandler;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.react.bridge.queue.ReactQueueConfigurationImpl;
import com.facebook.react.bridge.queue.ReactQueueConfigurationSpec;

import java.lang.ref.WeakReference;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.Map;

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
  private Scheduler mScheduler = null;
  private JavaScriptExecutor mJavaScriptExecutor;
  private MessageQueueThread mMessageQueueThread;
  private ReactQueueConfigurationImpl queueHolder;

  public NativeProxy(ReactApplicationContext context) {
    RuntimeType runtimeType = detectRuntime(getExecutorFactory(context));
    queueHolder = ReactQueueConfigurationImpl.create(
            ReactQueueConfigurationSpec.createDefault(),
            new QueueThreadExceptionHandler() {
              @Override
              public void handleException(Exception e) {
                throw new RuntimeException(e);
              }
            }
    );
    mMessageQueueThread = queueHolder.getUIQueueThread();

    CallInvokerHolderImpl holder = (CallInvokerHolderImpl)context.getCatalystInstance().getJSCallInvokerHolder();
    mScheduler = new Scheduler(context);
    boolean isDebuggable =  ( 0 != ( context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE ) );
    mHybridData = initHybrid(
      context.getJavaScriptContextHolder().get(),
      holder,
      mScheduler,
      mJavaScriptExecutor,
      mMessageQueueThread,
      isDebuggable,
      runtimeType.ordinal()
    );
    mContext = new WeakReference<>(context);
    prepare();
  }

  private RuntimeType detectRuntime(JavaScriptExecutorFactory executorFactory) {
    String factoryName = executorFactory.toString();
    if(factoryName.equals("JSIExecutor+HermesRuntime")) {
      return RuntimeType.HERMES;
    }
    return RuntimeType.OTHER;
  }

  private JavaScriptExecutorFactory getExecutorFactory(ReactApplicationContext context) {
    JavaScriptExecutorFactory factory = null;
      try {
        Constructor<ReactInstanceManagerBuilder> constructor =
          (Constructor<ReactInstanceManagerBuilder>)
          ReactInstanceManagerBuilder.class.getDeclaredConstructors()[0];
        constructor.setAccessible(true);
        ReactInstanceManagerBuilder reactInstanceManagerBuilder = constructor.newInstance();
        Method getDefaultJSExecutorFactory = reactInstanceManagerBuilder
          .getClass()
          .getDeclaredMethod(
            "getDefaultJSExecutorFactory",
            String.class,
            String.class,
            Context.class
          );
        getDefaultJSExecutorFactory.setAccessible(true);
        factory = (JavaScriptExecutorFactory) getDefaultJSExecutorFactory.invoke(
          reactInstanceManagerBuilder,
          "Reanimated",
          "Reanimated",
          context
        );
        assert factory != null;
        mJavaScriptExecutor = factory.create();
      } catch (Exception e) {
        e.printStackTrace();
      }
    return factory;
  }

  private native HybridData initHybrid(
          long jsContext,
          CallInvokerHolderImpl jsCallInvokerHolder,
          Scheduler scheduler,
          JavaScriptExecutor mJavaScriptExecutor,
          MessageQueueThread mMessageQueueThread,
          boolean isDebug,
          int runtimeType
  );
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
  }

  public void prepare() {
    mNodesManager = mContext.get().getNativeModule(ReanimatedModule.class).getNodesManager();
    installJSIBindings();
  }
}
