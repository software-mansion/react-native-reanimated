package com.swmansion.reanimated;

import com.facebook.react.bridge.UIManager;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;

public class NativeProxy {

  static {
    System.loadLibrary("reanimated");
  }

  private static UIManagerModule mManager;

  public static void setUIManager(UIManagerModule uiManager) {
    mManager = uiManager;
  }

  public static native void install(long runtimePtr);

  public static native void triggerScheduler();

  public static int scheduleTrigger(boolean x)  {
    mManager.addUIBlock(new UIBlock() {
      @Override
      public void execute(NativeViewHierarchyManager nativeViewHierarchyManager) {
        NativeProxy.triggerScheduler();
      }
    });
    return 1;
  }
}
