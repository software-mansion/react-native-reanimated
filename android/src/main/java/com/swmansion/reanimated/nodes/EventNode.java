package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.reflection.CallbackWrapper;

import javax.annotation.Nullable;

public class EventNode extends MapNode implements RCTEventEmitter {
  public EventNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
  }

  @Override
  public void receiveEvent(int targetTag, String eventName, @Nullable WritableMap event) {
    if (event == null) {
      throw new JSApplicationIllegalArgumentException("Animated events must have event data.");
    }

    setValue(event);
  }

  @Override
  public void receiveTouches(String eventName, WritableArray touches, WritableArray changedIndices) {
    throw new RuntimeException("receiveTouches is not support by animated events");
  }

  @Nullable
  @Override
  protected Object evaluate() {
    return ZERO;
  }

  public static void dispatchLayoutEvent(final ReactContext context, final int viewTag, final EventNode node) {
    context.getNativeModule(UIManagerModule.class)
            .measure(viewTag, new CallbackWrapper(node) {
              @Override
              public void invoke(Object... args) {
                final Utils.ReanimatedWritableNativeMap event = new Utils.ReanimatedWritableNativeMap();
                Utils.ReanimatedWritableNativeMap layout = new Utils.ReanimatedWritableNativeMap();
                Utils.putVariant(layout, "x", args[0]);
                Utils.putVariant(layout, "y", args[1]);
                Utils.putVariant(layout, "width", args[2]);
                Utils.putVariant(layout, "height", args[3]);
                event.putInt("target", viewTag);
                event.putMap("layout", layout);
                node.receiveEvent(viewTag, "onLayout", event);
              }
            });
  }
}
