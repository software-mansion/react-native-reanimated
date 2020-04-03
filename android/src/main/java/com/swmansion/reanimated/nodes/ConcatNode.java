package com.swmansion.reanimated.nodes;

import java.text.NumberFormat;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class ConcatNode extends Node {
  private final int[] mInputIDs;
  private final static NumberFormat sFormatter = NumberFormat.getInstance();
  static {
    sFormatter.setMinimumFractionDigits(0);
  }

  public ConcatNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mInputIDs = Utils.processIntArray(config.getArray("input"));
  }

  @Override
  protected String evaluate() {
    StringBuilder builder = new StringBuilder();
    for (int i = 0; i < mInputIDs.length; i++) {
      Node inputNodes = mNodesManager.findNodeById(mInputIDs[i], Node.class);
      Object value = inputNodes.value();
      if (value instanceof Double) {
        value = sFormatter.format((Double) value);
      }
      builder.append(value);
    }
    return builder.toString();
  }
}
