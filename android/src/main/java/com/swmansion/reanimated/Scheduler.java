package com.swmansion.reanimated;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;

import java.lang.ref.WeakReference;

public class Scheduler {

  private static WeakReference<UIManagerModule> mUIManager;
  private static WeakReference<ReactContext> mReactContext;

  static void setUIManager(UIManagerModule uiManagerModule) {
    mUIManager = new WeakReference<>(uiManagerModule);
  }

  static void setContext(ReactContext reactContext) {
    mReactContext = new WeakReference<>(reactContext);
  }

  static native void triggerUI();

  static native void triggerJS();

  static boolean scheduleTriggerOnUI() {
    if (mUIManager.get() == null) {
      return false;
    }
    mUIManager.get().addUIBlock(new UIBlock() {
      @Override
      public void execute(NativeViewHierarchyManager nativeViewHierarchyManager) {
        triggerUI();
      }
    });
    return true;
  }

  static boolean scheduleTriggerOnJS() {
    if (mReactContext.get() == null) {
      return false;
    }
    mReactContext.get().runOnJSQueueThread(new Runnable() {
      @Override
      public void run() {
        triggerJS();
      }
    });
    return true;
  }

}
