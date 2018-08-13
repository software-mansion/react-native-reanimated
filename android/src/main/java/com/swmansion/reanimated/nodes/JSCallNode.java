package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.EvalContext;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class JSCallNode extends Node<Double> {

  private final int[] mInputIDs;

  public JSCallNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mInputIDs = Utils.processIntArray(config.getArray("input"));
  }

  @Override
  protected Double evaluate(EvalContext evalContext) {
    WritableArray args = Arguments.createArray();
    for (int i = 0; i < mInputIDs.length; i++) {
      Node node = mNodesManager.findNodeById(mInputIDs[i], Node.class);
      if (node.value(evalContext) == null) {
        args.pushNull();
      } else {
        args.pushDouble(node.doubleValue(evalContext));
      }
    }
    WritableMap eventData = Arguments.createMap();
    eventData.putInt("id", mNodeID);
    eventData.putArray("args", args);
    mNodesManager.sendEvent("onReanimatedCall", eventData);
    return ZERO;
  }
}
