package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class AlwaysEvaluativeNode extends Node<Double> implements FinalNode {
  public AlwaysEvaluativeNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mNodeToBeValued = config.getInt("what");
  }

  private int mNodeToBeValued;

  @Override
  public void update() {
    mNodesManager.findNodeById(mNodeToBeValued).value();
  }

  @Override
  protected Double evaluate() {
    return 0.0;
  }

}
