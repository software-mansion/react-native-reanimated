package com.swmansion.reanimated;

import static com.facebook.react.bridge.ReactMarkerConstants.CREATE_UI_MANAGER_MODULE_END;
import static com.facebook.react.bridge.ReactMarkerConstants.CREATE_UI_MANAGER_MODULE_START;

import android.app.Application;

import androidx.annotation.Nullable;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactPackage;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.devsupport.LogBoxModule;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.modules.bundleloader.NativeDevSplitBundleLoaderModule;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.modules.core.ExceptionsManagerModule;
import com.facebook.react.modules.core.HeadlessJsTaskSupportModule;
import com.facebook.react.modules.core.TimingModule;
import com.facebook.react.modules.debug.DevSettingsModule;
import com.facebook.react.modules.debug.SourceCodeModule;
import com.facebook.react.modules.deviceinfo.DeviceInfoModule;
import com.facebook.react.modules.systeminfo.AndroidInfoModule;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.systrace.Systrace;
import com.facebook.react.uimanager.ReanimatedUIManager;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ReanimatedPackage extends TurboReactPackage {

    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        if (name.equals(ReanimatedModule.NAME)) {
            return new ReanimatedModule(reactContext);
        }
        if (name.equals(ReanimatedUIManager.NAME)) {
            return createUIManager(reactContext);
        }
        return null;
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        Class<? extends NativeModule>[] moduleList =
                new Class[] {
                        ReanimatedModule.class,
                        ReanimatedUIManager.class,
                };

        final Map<String, ReactModuleInfo> reactModuleInfoMap = new HashMap<>();
        for (Class<? extends NativeModule> moduleClass : moduleList) {
            ReactModule reactModule = moduleClass.getAnnotation(ReactModule.class);

            reactModuleInfoMap.put(
                    reactModule.name(),
                    new ReactModuleInfo(
                            reactModule.name(),
                            moduleClass.getName(),
                            true,
                            reactModule.needsEagerInit(),
                            reactModule.hasConstants(),
                            reactModule.isCxxModule(),
                            TurboModule.class.isAssignableFrom(moduleClass)));
        }

        return new ReactModuleInfoProvider() {
            @Override
            public Map<String, ReactModuleInfo> getReactModuleInfos() {
                return reactModuleInfoMap;
            }
        };
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
