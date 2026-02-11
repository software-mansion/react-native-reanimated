package com.swmansion.reanimated;

import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = ReanimatedModule.NAME)
public class ReanimatedModule extends NativeReanimatedModuleSpec implements LifecycleEventListener {
  private NodesManager mNodesManager;
  private boolean mTurboModuleInstalled = false;

  public ReanimatedModule(ReactApplicationContext reactContext) {
    super(reactContext);
    reactContext.assertOnJSQueueThread();
  }

  @Override
  public void initialize() {
    ReactApplicationContext reactContext = getReactApplicationContext();
    reactContext.assertOnJSQueueThread();
    reactContext.addLifecycleEventListener(this);
  }

  @Override
  public void onHostPause() {
    if (mNodesManager != null) {
      mNodesManager.onHostPause();
    }
  }

  @Override
  public void onHostResume() {
    if (mNodesManager != null) {
      mNodesManager.onHostResume();
    }
  }

  @Override
  public void onHostDestroy() {
    // do nothing
  }

  public NodesManager getNodesManager() {
    // This method is called from react-native-gesture-handler.
    return mNodesManager;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installTurboModule() {
    ReactApplicationContext reactContext = getReactApplicationContext();
    reactContext.assertOnJSQueueThread();
    mNodesManager = new NodesManager(reactContext);
    mNodesManager.getNativeProxy().installJSIBindings();
    return true;
  }

  @ReactMethod
  public void addListener(String ignoredEventName) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  @ReactMethod
  public void removeListeners(Integer ignoredCount) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  @Override
  public void invalidate() {
    super.invalidate();
    if (mNodesManager != null) {
      mNodesManager.invalidate();
    }
    ReactApplicationContext reactContext = getReactApplicationContext();
    reactContext.removeLifecycleEventListener(this);
  }
}
