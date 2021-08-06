package com.swmansion.reanimated;

import static com.facebook.react.bridge.ReactMarkerConstants.CREATE_UI_MANAGER_MODULE_END;
import static com.facebook.react.bridge.ReactMarkerConstants.CREATE_UI_MANAGER_MODULE_START;

import android.app.Application;

import androidx.annotation.Nullable;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.systrace.Systrace;
import com.swmansion.reanimated.layoutReanimation.ReanimatedUIManager;

import java.util.Arrays;
import java.util.List;

public class ReanimatedPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    return Arrays.<NativeModule>asList(new ReanimatedModule(reactContext), createUIManager(reactContext));
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Arrays.asList();
  }

  private UIManagerModule createUIManager(final ReactApplicationContext reactContext) {
    ReactMarker.logMarker(CREATE_UI_MANAGER_MODULE_START);
    Systrace.beginSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE, "createUIManagerModule");
    final ReactInstanceManager reactInstanceManager = ((ReactApplication)reactContext.getApplicationContext()).getReactNativeHost().getReactInstanceManager();
    boolean lazyViewManagersEnabled = false;
    int minTimeLeftInFrameForNonBatchedOperationMs = -1;
    try {
      if (lazyViewManagersEnabled) {
        UIManagerModule.ViewManagerResolver resolver =
                new UIManagerModule.ViewManagerResolver() {
                  @Override
                  public @Nullable
                  ViewManager getViewManager(String viewManagerName) {
                    return reactInstanceManager.createViewManager(viewManagerName);
                  }

                  @Override
                  public List<String> getViewManagerNames() {
                    return reactInstanceManager.getViewManagerNames();
                  }
                };

        return new ReanimatedUIManager(
                reactContext, resolver, minTimeLeftInFrameForNonBatchedOperationMs);
      } else {
        return new ReanimatedUIManager(
                reactContext,
                reactInstanceManager.getOrCreateViewManagers(reactContext),
                minTimeLeftInFrameForNonBatchedOperationMs);
      }
    } finally {
      Systrace.endSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE);
      ReactMarker.logMarker(CREATE_UI_MANAGER_MODULE_END);
    }
  }
}
