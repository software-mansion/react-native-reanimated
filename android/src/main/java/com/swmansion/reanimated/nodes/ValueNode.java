package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.EvaluationContext;
import com.swmansion.reanimated.NodesManager;

import javax.annotation.Nullable;

public class ValueNode extends Node<Double> {

  private Double mValue;

  public ValueNode(int nodeID, @Nullable ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mValue = (config != null && config.hasKey("value")) ? config.getDouble("value") : null;
  }

  public void setValue(Double value, EvaluationContext context) {
    mValue = value;
    forceUpdateMemoizedValue(mValue, mNodesManager.mGlobalEvaluationContext);
  }

  @Override
  protected Double evaluate(EvaluationContext evaluationContext) {
    return mValue;
  }
}
