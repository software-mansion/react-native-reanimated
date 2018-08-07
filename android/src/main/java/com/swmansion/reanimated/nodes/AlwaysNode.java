package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.EvalContext;
import com.swmansion.reanimated.NodesManager;

public class AlwaysNode extends Node<Double> implements FinalNode {
  public AlwaysNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mNodeToBeEvaluated = config.getInt("what");
  }

  private int mNodeToBeEvaluated;

  @Override
  public void update() {
    this.value(mNodesManager.mGlobalEvalContext);
  }

  @Override
  protected Double evaluate(EvalContext evalContext) {
    mNodesManager.findNodeById(mNodeToBeEvaluated, Node.class).value(evalContext);
    return ZERO;
  }
}
