package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class BlockNode extends Node {

  private final int[] mBlock;

  public BlockNode(int nodeID, final int[] block, NodesManager nodesManager) {
    super(nodeID, null, nodesManager);
    mBlock = block;
  }

  @Override
  protected Object evaluate() {
    Object res = null;
    for (int i = 0; i < mBlock.length; i++) {
      res = mNodesManager.findNodeById(mBlock[i], Node.class).value();
    }
    return res;
  }
}
