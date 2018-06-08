package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class AlwaysNode extends Node<Double> implements FinalNode {
  public AlwaysNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mNodeToBeValued = config.getInt("what");
  }

  private int mNodeToBeValued;

  @Override
  public void update() {
    mNodesManager.findNodeById(mNodeToBeValued, Node.class).value();
  }

  @Override
  protected Double evaluate() {
    return 0.0;
  }

}
