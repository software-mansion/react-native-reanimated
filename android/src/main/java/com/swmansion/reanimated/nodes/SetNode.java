package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class SetNode extends Node<Double> {

  private int mWhatNodeID, mValueNodeID;

  public SetNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mWhatNodeID = config.getInt("what");
    mValueNodeID = config.getInt("value");
  }

  @Override
  protected Double evaluate() {
    Double newValue = (Double) mNodesManager.findNodeById(mValueNodeID).value();
    Node what = mNodesManager.findNodeById(mWhatNodeID);
    if (what instanceof ValueNode) {
      ((ValueNode) what).setValue(newValue);
    } else {
      throw new JSApplicationIllegalArgumentException("Destination node for set should be a value node");
    }
    return newValue;
  }
}
