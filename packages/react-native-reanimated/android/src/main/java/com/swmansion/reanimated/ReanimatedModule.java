package com.swmansion.reanimated;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.interfaces.BindingsInstallerHolder;
import com.facebook.react.turbomodule.core.interfaces.TurboModuleWithJSIBindings;
import com.swmansion.worklets.WorkletsModule;

@ReactModule(name = ReanimatedModule.NAME)
public class ReanimatedModule extends NativeReanimatedModuleSpec
    implements LifecycleEventListener, TurboModuleWithJSIBindings {
  private final NodesManager mNodesManager;
  private final WorkletsModule mWorkletsModule;

  public ReanimatedModule(ReactApplicationContext reactContext) {
    super(reactContext);
    reactContext.assertOnJSQueueThread();
    mWorkletsModule = reactContext.getNativeModule(WorkletsModule.class);
    mNodesManager = new NodesManager(reactContext, mWorkletsModule);
  }

  @Override
  public void initialize() {
    ReactApplicationContext reactContext = getReactApplicationContext();
    reactContext.assertOnJSQueueThread();
    reactContext.addLifecycleEventListener(this);
  }

  @Override
  public void onHostPause() {
    mNodesManager.onHostPause();
  }

  @Override
  public void onHostResume() {
    mNodesManager.onHostResume();
  }

  @Override
  public void onHostDestroy() {
    // do nothing
  }

  public NodesManager getNodesManager() {
    // This method is called from react-native-gesture-handler.
    return mNodesManager;
  }

  // TODO: remove this method
  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installTurboModule() {
    getReactApplicationContext().assertOnJSQueueThread();
    return true;
  }

  @NonNull
  @Override
  public BindingsInstallerHolder getBindingsInstaller() {
    return mNodesManager.getNativeProxy().getBindingsInstaller();
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
    mNodesManager.invalidate();
    ReactApplicationContext reactContext = getReactApplicationContext();
    reactContext.removeLifecycleEventListener(this);
  }
}
