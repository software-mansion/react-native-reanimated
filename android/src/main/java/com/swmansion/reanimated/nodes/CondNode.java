package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.EvaluationContext;
import com.swmansion.reanimated.NodesManager;

public class CondNode extends Node {

  private final int mCondID, mIfBlockID, mElseBlockID;

  public CondNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mCondID = config.getInt("cond");
    mIfBlockID = config.hasKey("ifBlock") ? config.getInt("ifBlock") : -1;
    mElseBlockID = config.hasKey("elseBlock") ? config.getInt("elseBlock") : -1;
  }

  @Override
  protected Object evaluate(EvaluationContext evaluationContext) {
    Object cond = mNodesManager.getNodeValue(mCondID, evaluationContext);
    if (cond instanceof Number && ((Number) cond).doubleValue() != 0.0) {
      // This is not a good way to compare doubles but in this case it is what we want
      return mIfBlockID != -1 ? mNodesManager.getNodeValue(mIfBlockID, evaluationContext) : ZERO;
    }
    return mElseBlockID != -1 ? mNodesManager.getNodeValue(mElseBlockID, evaluationContext) : ZERO;
  }
}
