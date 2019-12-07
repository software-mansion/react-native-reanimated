package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class SetNode extends Node {

  private int mWhatNodeID, mValueNodeID;

  public SetNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mWhatNodeID = config.getInt("what");
    mValueNodeID = config.getInt("value");
  }

  @Override
  protected Object evaluate() {
    Object newValue = mNodesManager.getNodeValue(mValueNodeID);
    Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    ((ValueManagingNode) what).setValue(newValue);
    return newValue;
  }
}
