package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class AlwaysNode extends Node implements FinalNode {
  public AlwaysNode(int nodeID, int what, NodesManager nodesManager) {
    super(nodeID, null, nodesManager);
    mNodeToBeEvaluated = what;
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
