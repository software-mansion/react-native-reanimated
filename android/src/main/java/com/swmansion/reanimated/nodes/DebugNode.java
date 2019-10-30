package com.swmansion.reanimated.nodes;

import android.util.Log;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class DebugNode extends Node {

  private final String mMessage;
  private final int mValueID;

  public DebugNode(int nodeID, final String message, final int value, NodesManager nodesManager) {
    super(nodeID, null, nodesManager);
    mMessage = message;
    mValueID = value;
  }

  @Override
  protected Object evaluate() {
    Object value = mNodesManager.findNodeById(mValueID, Node.class).value();
    Log.d("REANIMATED", String.format("%s %s", mMessage, value));
    return value;
  }
}
