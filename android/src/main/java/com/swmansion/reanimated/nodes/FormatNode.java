package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import java.text.NumberFormat;
import java.text.DecimalFormat;

public class FormatNode extends Node {
  private NumberFormat nf;
  private final int mInputID;

  public FormatNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mInputID = config.getInt("value");
    nf = new DecimalFormat(config.getString("format"));
  }

  @Override
  protected String evaluate() {
    StringBuilder builder = new StringBuilder();
    Node inputNode = mNodesManager.findNodeById(mInputID, Node.class);
    Object value = inputNode.value();
    if (value instanceof Double) {
      builder.append(nf.format(value));
    } else {
      builder.append(value);
    }
    return builder.toString();
  }
}
