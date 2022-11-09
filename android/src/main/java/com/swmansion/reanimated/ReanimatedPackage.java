package com.swmansion.reanimated;

import static com.facebook.react.bridge.ReactMarkerConstants.CREATE_UI_MANAGER_MODULE_END;
import static com.facebook.react.bridge.ReactMarkerConstants.CREATE_UI_MANAGER_MODULE_START;

import android.os.Build;
import android.util.Log;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactPackage;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.uimanager.ReanimatedUIImplementation;
import com.facebook.react.uimanager.ReanimatedUIManager;
import com.facebook.react.uimanager.UIImplementation;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.uimanager.ViewManagerRegistry;
import com.facebook.systrace.Systrace;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ReanimatedPackage extends TurboReactPackage implements ReactPackage {

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
          ReanimatedModule.class, ReanimatedUIManager.class,
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
    final ReactInstanceManager reactInstanceManager = getReactInstanceManager(reactContext);
    int minTimeLeftInFrameForNonBatchedOperationMs = -1;
    try {
      List<ViewManager> viewManagers = reactInstanceManager.getOrCreateViewManagers(reactContext);
      ViewManagerRegistry viewManagerRegistry = new ViewManagerRegistry(viewManagers);

      UIManagerModule uiManagerModule =
          new ReanimatedUIManager(
              reactContext, viewManagers, minTimeLeftInFrameForNonBatchedOperationMs);

      UIImplementation uiImplementation =
          new ReanimatedUIImplementation(
              reactContext,
              viewManagerRegistry,
              uiManagerModule.getEventDispatcher(),
              minTimeLeftInFrameForNonBatchedOperationMs);

      Class clazz = uiManagerModule.getClass().getSuperclass();
      if (clazz == null) {
        Log.e("reanimated", "unable to resolve super class of ReanimatedUIManager");
        return uiManagerModule;
      }

      try {
        Field uiImplementationField = clazz.getDeclaredField("mUIImplementation");
        uiImplementationField.setAccessible(true);

        if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          try {
            // accessFlags is supported only by API >=23
            Field modifiersField = Field.class.getDeclaredField("accessFlags");
            modifiersField.setAccessible(true);
            modifiersField.setInt(
                uiImplementationField, uiImplementationField.getModifiers() & ~Modifier.FINAL);
          } catch (NoSuchFieldException | IllegalAccessException e) {
            e.printStackTrace();
          }
        }
        uiImplementationField.set(uiManagerModule, uiImplementation);
      } catch (NoSuchFieldException | IllegalAccessException e) {
        e.printStackTrace();
      }

      return uiManagerModule;
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
