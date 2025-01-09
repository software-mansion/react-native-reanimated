package com.swmansion.reanimated;

import android.util.Log;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.bridge.UIManagerListener;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.UIManagerModuleListener;
import com.swmansion.worklets.WorkletsModule;
import java.util.ArrayList;
import java.util.Objects;
import javax.annotation.Nullable;

@ReactModule(name = ReanimatedModule.NAME)
public class ReanimatedModule extends NativeReanimatedModuleSpec
    implements LifecycleEventListener, UIManagerModuleListener, UIManagerListener {

  public void didDispatchMountItems(@NonNull UIManager uiManager) {
    // Keep: Required for UIManagerListener
  }

  public void didMountItems(@NonNull UIManager uiManager) {
    // Keep: Required for UIManagerListener
  }

  public void didScheduleMountItems(@NonNull UIManager uiManager) {
    // Keep: Required for UIManagerListener
  }

  public void willDispatchViewUpdates(@NonNull UIManager uiManager) {
    // This method is called for the interface of UIManagerListener on Fabric.
    // The below function with the same name won't be called.
    if (mOperations.isEmpty()) {
      return;
    }
    final ArrayList<UIThreadOperation> operations = mOperations;
    mOperations = new ArrayList<>();
    if (uiManager instanceof FabricUIManager) {
      ((FabricUIManager) uiManager)
          .addUIBlock(
              uiBlockViewResolver -> {
                NodesManager nodesManager = getNodesManager();
                for (UIThreadOperation operation : operations) {
                  operation.execute(nodesManager);
                }
              });
    } else {
      throw new RuntimeException("[Reanimated] Failed to obtain instance of FabricUIManager.");
    }
  }

  public void willMountItems(@NonNull UIManager uiManager) {}

  private interface UIThreadOperation {
    void execute(NodesManager nodesManager);
  }

  private ArrayList<UIThreadOperation> mOperations = new ArrayList<>();
  private @Nullable NodesManager mNodesManager;
  private final WorkletsModule mWorkletsModule;
  private Runnable mUnsubscribe = () -> {};

  public ReanimatedModule(ReactApplicationContext reactContext) {
    super(reactContext);
    mWorkletsModule = reactContext.getNativeModule(WorkletsModule.class);
  }

  public WorkletsModule getWorkletsModule() {
    return mWorkletsModule;
  }

  @Override
  public void initialize() {
    ReactApplicationContext reactCtx = getReactApplicationContext();

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      UIManager uiManager = reactCtx.getFabricUIManager();
      if (uiManager instanceof FabricUIManager) {
        ((FabricUIManager) uiManager).addUIManagerEventListener(this);
        mUnsubscribe =
            Utils.combineRunnables(
                mUnsubscribe,
                () -> ((FabricUIManager) uiManager).removeUIManagerEventListener(this));
      } else {
        throw new RuntimeException("[Reanimated] Failed to obtain instance of FabricUIManager.");
      }
    } else {
      UIManagerModule uiManager =
          Objects.requireNonNull(reactCtx.getNativeModule(UIManagerModule.class));
      uiManager.addUIManagerListener(this);
      mUnsubscribe =
          Utils.combineRunnables(mUnsubscribe, () -> uiManager.removeUIManagerListener(this));
    }
    reactCtx.addLifecycleEventListener(this);
    mUnsubscribe =
        Utils.combineRunnables(mUnsubscribe, () -> reactCtx.removeLifecycleEventListener(this));
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

  @Override
  public void willDispatchViewUpdates(final UIManagerModule uiManager) {
    // This method is called for the interface of UIManagerModuleListener on
    // Paper. The below function with the same name won't be called.
    if (mOperations.isEmpty()) {
      return;
    }
    final ArrayList<UIThreadOperation> operations = mOperations;
    mOperations = new ArrayList<>();
    uiManager.addUIBlock(
        nativeViewHierarchyManager -> {
          NodesManager nodesManager = getNodesManager();
          for (UIThreadOperation operation : operations) {
            operation.execute(nodesManager);
          }
        });
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

    mUnsubscribe.run();
  }
}
