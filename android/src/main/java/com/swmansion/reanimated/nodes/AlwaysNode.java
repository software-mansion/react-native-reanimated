package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.NoSuchKeyException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class AlwaysNode extends Node implements FinalNode {
  public AlwaysNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    try {
      mNodeToBeEvaluated = config.getInt("what");
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException("Argument passed to Reanimated always node might be of wrong type. NodeID: " + nodeID );
    }
  }

  private int mNodeToBeEvaluated;

  @Override
  public void update() {
    this.value();
  }

  @Override
  protected Double evaluate() {
    mNodesManager.findNodeById(mNodeToBeEvaluated, Node.class).value();
    return ZERO;
  }
}
