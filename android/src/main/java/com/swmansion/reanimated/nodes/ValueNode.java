package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;

import javax.annotation.Nullable;

public class ValueNode extends Node {

  private Object mValue;

  public ValueNode(int nodeID, @Nullable ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    if (config == null || !config.hasKey("value")) {
      mValue = null;
      return;
    }
    ReadableType type = config.getType("value");
    if (type == ReadableType.String) {
      mValue = config.getString("value");
    } else if (type == ReadableType.Number) {
      mValue = config.getDouble("value");
    } else if (type == ReadableType.Null) {
      mValue = null;
    } else {
      throw new IllegalStateException("Not supported value type. Must be boolean, number or string");
    }
  }

  public void setValue(Object value) {
    mValue = value;
    forceUpdateMemoizedValue(mValue);
  }

  @Override
  protected Object evaluate() {
    return mValue;
  }

  @Override
  public void onDrop() {
    WritableMap eventData = Arguments.createMap();
    eventData.putInt("id", mNodeID);
   if (mValue instanceof String) {
      eventData.putString("value", (String) mValue);
    } else if (mValue instanceof Double) {
      eventData.putDouble("value", (Double) mValue);
    } else {
      eventData.putNull("value");
    }
    mNodesManager.sendEvent("onReanimatedValueDropped", eventData);
  }
}
