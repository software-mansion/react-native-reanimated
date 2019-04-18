package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.NoSuchKeyException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class SetNode extends Node {

  private int mWhatNodeID, mValueNodeID;

  public SetNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    try {
      mWhatNodeID = config.getInt("what");
      mValueNodeID = config.getInt("value");
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException("Arguments passed to Reanimated set node might be of wrong type. NodeID: " + nodeID );
    }
  }

  @Override
  protected Object evaluate() {
    Object newValue = mNodesManager.getNodeValue(mValueNodeID);
    ValueNode what = mNodesManager.findNodeById(mWhatNodeID, ValueNode.class);
    what.setValue(newValue);
    return newValue;
  }
}
