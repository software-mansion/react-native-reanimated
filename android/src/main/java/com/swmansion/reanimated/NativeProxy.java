package com.swmansion.reanimated;

import android.util.Pair;

import com.facebook.react.bridge.NativeMap;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.turbomodule.core.JSCallInvokerHolderImpl;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import java.util.ArrayList;

import androidx.annotation.Nullable;

public class NativeProxy {

  private static String eventHash;
  private static String eventAsString;
  public static EventHijacker eventHijacker = new EventHijacker();

  static {
    System.loadLibrary("reanimated");
  }

  public static native void install(long runtimePtr);

  public static native void uiCall();

  public static native boolean anyRenderApplier();

  public static native ArrayList<Pair<Integer, Object>> getChangedSharedValuesAfterRender();

  public static native boolean shouldEventBeHijacked(String eventHash);

  public static native ArrayList<Pair<Integer, Object>> getChangedSharedValuesAfterEvent(String eventHash, String eventAsString);

  public static ArrayList<Pair<Integer, Object>> getChangedSharedValuesAfterEventProxy() {
    return getChangedSharedValuesAfterEvent(eventHash, eventAsString);
  }

  static class EventHijacker implements RCTEventEmitter {
    @Override
    public void receiveEvent(int targetTag, String eventName, @Nullable WritableMap event) {
      String eventHash = String.valueOf(targetTag) + eventName;
      String eventAsString = ((NativeMap)event).toString();
      NativeProxy.eventHash = eventHash;
      NativeProxy.eventAsString = eventAsString;
    }

    @Override
    public void receiveTouches(String eventName, WritableArray touches, WritableArray changedIndices) {
      //TODO what should be here ?
    }
  }

}
