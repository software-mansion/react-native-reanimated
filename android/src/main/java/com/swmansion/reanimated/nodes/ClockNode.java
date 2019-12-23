package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class ClockNode extends Node implements NodesManager.OnAnimationFrame {

  private boolean mIsRunning;

  public ClockNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
  }

  public void start() {
    if (mIsRunning) {
      return;
    }
    mIsRunning = true;
    mNodesManager.postOnAnimation(this);
  }

  public boolean isRunning() {
    return mIsRunning;
  }

  public void stop() {
    mIsRunning = false;
  }

  @Override
  protected Double evaluate() {
    return mNodesManager.currentFrameTimeMs;
  }

  @Override
  public void onAnimationFrame() {
    if (mIsRunning) {
      markUpdated();
      mNodesManager.postOnAnimation(this);
    }
  }
}
