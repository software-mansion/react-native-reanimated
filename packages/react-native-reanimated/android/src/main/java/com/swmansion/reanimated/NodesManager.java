package com.swmansion.reanimated;

import android.os.SystemClock;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.modules.core.ReactChoreographer;
import com.facebook.react.uimanager.GuardedFrameCallback;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.common.UIManagerType;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.EventDispatcherListener;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.systrace.Systrace;
import com.swmansion.reanimated.nativeProxy.NoopEventHandler;
import com.swmansion.worklets.WorkletsModule;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.annotation.Nullable;

public class NodesManager implements EventDispatcherListener {

  private Long mFirstUptime = SystemClock.uptimeMillis();
  private boolean mSlowAnimationsEnabled = false;
  private int mAnimationsDragFactor;

  public interface OnAnimationFrame {
    void onAnimationFrame(double timestampMs);
  }

  private final WorkletsModule mWorkletsModule;
  private final DeviceEventManagerModule.RCTDeviceEventEmitter mEventEmitter;
  private final ReactChoreographer mReactChoreographer;
  private final GuardedFrameCallback mChoreographerCallback;
  protected final UIManagerModule.CustomEventNamesResolver mCustomEventNamesResolver;
  private final AtomicBoolean mCallbackPosted = new AtomicBoolean();
  private RCTEventEmitter mCustomEventHandler = new NoopEventHandler();
  private List<OnAnimationFrame> mFrameCallbacks = new ArrayList<>();
  private ConcurrentLinkedQueue<CopiedEvent> mEventQueue = new ConcurrentLinkedQueue<>();
  private double lastFrameTimeMs;
  private FabricUIManager mFabricUIManager;
  private @Nullable Runnable mUnsubscribe = null;

  public NativeProxy getNativeProxy() {
    return mNativeProxy;
  }

  private NativeProxy mNativeProxy;

  public void invalidate() {
    if (mNativeProxy != null) {
      mNativeProxy.invalidate();
      mNativeProxy = null;
    }

    if (mFabricUIManager != null) {
      mFabricUIManager.getEventDispatcher().removeListener(this);
    }

    if (mUnsubscribe != null) {
      mUnsubscribe.run();
      mUnsubscribe = null;
    }
  }

  public void initWithContext(ReactApplicationContext reactApplicationContext) {
    reactApplicationContext.assertOnJSQueueThread();
    mNativeProxy = new NativeProxy(reactApplicationContext, mWorkletsModule);
    mFabricUIManager =
        (FabricUIManager)
            UIManagerHelper.getUIManager(reactApplicationContext, UIManagerType.FABRIC);
    mFabricUIManager.getEventDispatcher().addListener(this);
  }

  public NodesManager(ReactContext context, WorkletsModule workletsModule) {
    context.assertOnJSQueueThread();

    mWorkletsModule = workletsModule;
    UIManager mUIManager = UIManagerHelper.getUIManager(context, UIManagerType.FABRIC);
    assert mUIManager != null;
    mCustomEventNamesResolver = mUIManager::resolveCustomDirectEventName;
    mEventEmitter = context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class);

    mReactChoreographer = ReactChoreographer.getInstance();
    mChoreographerCallback =
        new GuardedFrameCallback(context) {
          @Override
          protected void doFrameGuarded(long frameTimeNanos) {
            onAnimationFrame(frameTimeNanos);
          }
        };
  }

  public void onHostPause() {
    if (mCallbackPosted.get()) {
      stopUpdatingOnAnimationFrame();
      mCallbackPosted.set(true);
    }
  }

  public boolean isAnimationRunning() {
    return mCallbackPosted.get();
  }

  public void onHostResume() {
    if (mCallbackPosted.getAndSet(false)) {
      startUpdatingOnAnimationFrame();
    }
  }

  public void startUpdatingOnAnimationFrame() {
    if (!mCallbackPosted.getAndSet(true)) {
      mReactChoreographer.postFrameCallback(
          ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE, mChoreographerCallback);
    }
  }

  private void stopUpdatingOnAnimationFrame() {
    if (mCallbackPosted.getAndSet(false)) {
      mReactChoreographer.removeFrameCallback(
          ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE, mChoreographerCallback);
    }
  }

  public void performOperations() {
    UiThreadUtil.assertOnUiThread();
    if (mNativeProxy != null) {
      mNativeProxy.performOperations();
    }
  }

  private void onAnimationFrame(long frameTimeNanos) {
    UiThreadUtil.assertOnUiThread();

    try {
      if (BuildConfig.REANIMATED_PROFILING) {
        Systrace.beginSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE, "onAnimationFrame");
      }

      double currentFrameTimeMs = frameTimeNanos / 1000000.;
      if (mSlowAnimationsEnabled) {
        currentFrameTimeMs =
            mFirstUptime + (currentFrameTimeMs - mFirstUptime) / mAnimationsDragFactor;
      }

      if (currentFrameTimeMs > lastFrameTimeMs) {
        // It is possible for ChoreographerCallback to be executed twice within the same frame
        // due to frame drops. If this occurs, the additional callback execution should be ignored.
        lastFrameTimeMs = currentFrameTimeMs;

        while (!mEventQueue.isEmpty()) {
          CopiedEvent copiedEvent = mEventQueue.poll();
          handleEvent(
              copiedEvent.getTargetTag(), copiedEvent.getEventName(), copiedEvent.getPayload());
        }

        if (!mFrameCallbacks.isEmpty()) {
          List<OnAnimationFrame> frameCallbacks = mFrameCallbacks;
          mFrameCallbacks = new ArrayList<>(frameCallbacks.size());
          for (int i = 0, size = frameCallbacks.size(); i < size; i++) {
            frameCallbacks.get(i).onAnimationFrame(currentFrameTimeMs);
          }
        }

        performOperations();
      }

      mCallbackPosted.set(false);
      if (!mFrameCallbacks.isEmpty() || !mEventQueue.isEmpty()) {
        // enqueue next frame
        startUpdatingOnAnimationFrame();
      }
    } finally {
      if (BuildConfig.REANIMATED_PROFILING) {
        Systrace.endSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE);
      }
    }
  }

  public void postOnAnimation(OnAnimationFrame onAnimationFrame) {
    mFrameCallbacks.add(onAnimationFrame);
    startUpdatingOnAnimationFrame();
  }

  @Override
  public void onEventDispatch(Event event) {
    try {
      if (BuildConfig.REANIMATED_PROFILING) {
        Systrace.beginSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE, "onEventDispatch");
      }

      if (mNativeProxy == null) {
        return;
      }
      // Events can be dispatched from any thread so we have to make sure handleEvent is run from
      // the UI thread.
      if (UiThreadUtil.isOnUiThread()) {
        handleEvent(event);
        performOperations();
      } else {
        String eventName = mCustomEventNamesResolver.resolveCustomEventName(event.getEventName());
        int viewTag = event.getViewTag();
        boolean shouldSaveEvent = mNativeProxy.isAnyHandlerWaitingForEvent(eventName, viewTag);
        if (shouldSaveEvent) {
          mEventQueue.offer(new CopiedEvent(event));
        }
        startUpdatingOnAnimationFrame();
      }
    } finally {
      if (BuildConfig.REANIMATED_PROFILING) {
        Systrace.endSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE);
      }
    }
  }

  private void handleEvent(Event event) {
    event.dispatch(mCustomEventHandler);
  }

  private void handleEvent(int targetTag, String eventName, @Nullable WritableMap event) {
    mCustomEventHandler.receiveEvent(targetTag, eventName, event);
  }

  public UIManagerModule.CustomEventNamesResolver getEventNameResolver() {
    return mCustomEventNamesResolver;
  }

  public void registerEventHandler(RCTEventEmitter handler) {
    mCustomEventHandler = handler;
  }

  public void sendEvent(String name, WritableMap body) {
    mEventEmitter.emit(name, body);
  }

  public void enableSlowAnimations(boolean slowAnimationsEnabled, int animationsDragFactor) {
    mSlowAnimationsEnabled = slowAnimationsEnabled;
    mAnimationsDragFactor = animationsDragFactor;
    if (slowAnimationsEnabled) {
      mFirstUptime = SystemClock.uptimeMillis();
    }
  }
}
