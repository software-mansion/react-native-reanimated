package com.swmansion.reanimated;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Arrays;
import java.util.List;

public class ReanimatedPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    return Arrays.<NativeModule>asList(new ReanimatedModule(reactContext));
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
<<<<<<< HEAD
    return Arrays.asList(((ViewManager) new TransitionViewManager()));
=======
    return Arrays.asList();
>>>>>>> parent of 6e156bb... Merge branch 'android-cwd' into patch-1
  }
}
