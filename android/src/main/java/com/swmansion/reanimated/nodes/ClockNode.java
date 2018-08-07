package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.EvalContext;
import com.swmansion.reanimated.NodesManager;

public class ClockNode extends Node<Double> implements NodesManager.OnAnimationFrame {

  public boolean isRunning;

  public ClockNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
  }

  public void start() {
    if (isRunning) {
      return;
    }
    isRunning = true;
    mNodesManager.postOnAnimation(this);
  }

  public void stop() {
    isRunning = false;
  }

  @Override
  protected Double evaluate(EvalContext evalContext) {
    return mNodesManager.currentFrameTimeMs;
  }

  @Override
  public void onAnimationFrame() {
    if (isRunning) {
      markUpdated(mNodesManager.mGlobalEvalContext);
      mNodesManager.postOnAnimation(this);
    }
  }
}
