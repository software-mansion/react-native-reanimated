package com.swmansion.reanimated;

import android.util.Log;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.swmansion.worklets.WorkletsModule;
import java.util.Objects;
import javax.annotation.Nullable;

@ReactModule(name = ReanimatedModule.NAME)
public class ReanimatedModule extends NativeReanimatedModuleSpec implements LifecycleEventListener {
  private @Nullable NodesManager mNodesManager;
  private final WorkletsModule mWorkletsModule;

  public ReanimatedModule(ReactApplicationContext reactContext) {
    super(reactContext);
    reactContext.assertOnJSQueueThread();
    mWorkletsModule = reactContext.getNativeModule(WorkletsModule.class);
  }

  public WorkletsModule getWorkletsModule() {
    return mWorkletsModule;
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

  /*package*/
  public NodesManager getNodesManager() {
    if (mNodesManager == null) {
      mNodesManager = new NodesManager(getReactApplicationContext(), mWorkletsModule);
    }

    return mNodesManager;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installTurboModule() {
    getReactApplicationContext().assertOnJSQueueThread();

    // When debugging in chrome the JS context is not available.
    // https://github.com/facebook/react-native/blob/v0.67.0-rc.6/ReactAndroid/src/main/java/com/facebook/react/modules/blob/BlobCollector.java#L25
    Utils.isChromeDebugger =
        Objects.requireNonNull(getReactApplicationContext().getJavaScriptContextHolder()).get()
            == 0;

    if (!Utils.isChromeDebugger) {
      this.getNodesManager().initWithContext(getReactApplicationContext());
      return true;
    } else {
      Log.w(
          "[REANIMATED]",
          "Unable to create Reanimated Native Module. You can ignore this message if you are using Chrome Debugger now.");
      return false;
    }
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
