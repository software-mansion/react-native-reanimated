package com.swmansion.reanimated.nodes;

import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.reflection.ReanimatedWritableNativeArray;

public class JSCallNode extends Node {

  private final int[] mInputIDs;

  public JSCallNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mInputIDs = Utils.processIntArray(config.getArray("input"));
  }

  @Override
  protected Double evaluate() {
    ReanimatedWritableNativeArray args = new ReanimatedWritableNativeArray();
    for (int i = 0; i < mInputIDs.length; i++) {
      Node node = mNodesManager.findNodeById(mInputIDs[i], Node.class);
      args.pushDynamic(node.exportableValue());
    }
    WritableMap eventData = Arguments.createMap();
    eventData.putInt("id", mNodeID);
    eventData.putArray("args", args);
    mNodesManager.sendEvent("onReanimatedCall", eventData);
    return ZERO;
  }
}
