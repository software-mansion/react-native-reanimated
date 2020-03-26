package com.swmansion.reanimated;

import android.os.Handler;
import android.util.Log;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.UIManagerModule;
import android.os.Looper;

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
    if (mReactContext.get() == null) {
      return false;
    }
    Looper looper = mReactContext.get().getMainLooper();
    Handler handler = new Handler(looper);
    handler.post(new Runnable() {
      @Override
      public void run() {
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
