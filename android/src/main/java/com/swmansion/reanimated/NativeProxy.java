package com.swmansion.reanimated;

import com.facebook.react.bridge.UIManager;
import com.facebook.react.turbomodule.core.JSCallInvokerHolderImpl;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;

public class NativeProxy {

  static {
    System.loadLibrary("reanimated");
  }

  public static native void install(long runtimePtr);

  public static native void uiCall();

}
