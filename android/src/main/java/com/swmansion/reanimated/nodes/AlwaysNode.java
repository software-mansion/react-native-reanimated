package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.EvaluationContext;
import com.swmansion.reanimated.NodesManager;

public class AlwaysNode extends Node<Double> implements FinalNode {
  public AlwaysNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mNodeToBeEvaluated = config.getInt("what");
  }

  private int mNodeToBeEvaluated;

  @Override
  public void update() {
    this.value(mNodesManager.mGlobalEvaluationContext);
  }

  @Override
  protected Double evaluate(EvaluationContext evaluationContext) {
    mNodesManager.findNodeById(mNodeToBeEvaluated, Node.class).value(evaluationContext);
    return ZERO;
  }
}
