package com.swmansion.reanimated;

import static com.facebook.react.bridge.ReactMarkerConstants.CREATE_UI_MANAGER_MODULE_END;
import static com.facebook.react.bridge.ReactMarkerConstants.CREATE_UI_MANAGER_MODULE_START;

import androidx.annotation.NonNull;
import com.facebook.react.BaseReactPackage;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.module.annotations.ReactModuleList;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.uimanager.ReanimatedUIManager;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.systrace.Systrace;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ReactModuleList(
    nativeModules = {
      ReanimatedModule.class,
      ReanimatedUIManager.class,
    })
public class ReanimatedPackage extends BaseReactPackage implements ReactPackage {
  @Override
  public NativeModule getModule(
      @NonNull String name, @NonNull ReactApplicationContext reactContext) {
    return switch (name) {
      case ReanimatedModule.NAME -> new ReanimatedModule(reactContext);
      case ReanimatedUIManager.NAME -> createUIManager(reactContext);
      default -> null;
    };
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    Class<? extends NativeModule>[] moduleList =
        new Class[] {
          ReanimatedModule.class, ReanimatedUIManager.class,
        };

    final Map<String, ReactModuleInfo> reactModuleInfoMap = new HashMap<>();
    for (Class<? extends NativeModule> moduleClass : moduleList) {
      ReactModule reactModule =
          Objects.requireNonNull(moduleClass.getAnnotation(ReactModule.class));

      reactModuleInfoMap.put(
          reactModule.name(),
          new ReactModuleInfo(
              reactModule.name(),
              moduleClass.getName(),
              true, // override UIManagerModule
              reactModule.needsEagerInit(),
              reactModule.isCxxModule(),
              BuildConfig.IS_NEW_ARCHITECTURE_ENABLED));
    }

    return () -> reactModuleInfoMap;
  }

  private UIManagerModule createUIManager(final ReactApplicationContext reactContext) {
    ReactMarker.logMarker(CREATE_UI_MANAGER_MODULE_START);
    Systrace.beginSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE, "createUIManagerModule");
    final ReactInstanceManager reactInstanceManager = getReactInstanceManager(reactContext);
    List<ViewManager> viewManagers = reactInstanceManager.getOrCreateViewManagers(reactContext);
    int minTimeLeftInFrameForNonBatchedOperationMs = -1;
    try {
      return ReanimatedUIManagerFactory.create(
          reactContext, viewManagers, minTimeLeftInFrameForNonBatchedOperationMs);
    } finally {
      Systrace.endSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE);
      ReactMarker.logMarker(CREATE_UI_MANAGER_MODULE_END);
    }
  }

  /**
   * Get the {@link ReactInstanceManager} used by this app. By default, assumes {@link
   * ReactApplicationContext#getApplicationContext()} is an instance of {@link ReactApplication} and
   * calls {@link ReactApplication#getReactNativeHost().getReactInstanceManager()}. Override this
   * method if your application class does not implement {@code ReactApplication} or you simply have
   * a different mechanism for storing a {@code ReactInstanceManager}, e.g. as a static field
   * somewhere.
   */
  public ReactInstanceManager getReactInstanceManager(ReactApplicationContext reactContext) {
    return ((ReactApplication) reactContext.getApplicationContext())
        .getReactNativeHost()
        .getReactInstanceManager();
  }
}
