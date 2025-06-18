package com.swmansion.worklets;

import androidx.annotation.NonNull;
import com.facebook.react.BaseReactPackage;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.module.annotations.ReactModuleList;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@ReactModuleList(nativeModules = {WorkletsModule.class})
public class WorkletsPackage extends BaseReactPackage implements ReactPackage {
  @Override
  public NativeModule getModule(
      @NonNull String name, @NonNull ReactApplicationContext reactContext) {
    return name.equals(WorkletsModule.NAME) ? new WorkletsModule(reactContext) : null;
  }

  @SuppressWarnings({"rawtypes, unchecked"})
  @NonNull
  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    Class[] moduleList = new Class[] {WorkletsModule.class};

    final Map<String, ReactModuleInfo> reactModuleInfoMap = new HashMap<>();
    for (Class<? extends NativeModule> moduleClass : moduleList) {
      ReactModule reactModule =
          Objects.requireNonNull(moduleClass.getAnnotation(ReactModule.class));

      reactModuleInfoMap.put(
          reactModule.name(),
          new ReactModuleInfo(
              reactModule.name(),
              moduleClass.getName(),
              reactModule.canOverrideExistingModule(),
              reactModule.needsEagerInit(),
              reactModule.isCxxModule(),
              true));
    }

    return () -> reactModuleInfoMap;
  }
}
