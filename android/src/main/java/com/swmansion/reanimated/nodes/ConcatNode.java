package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import java.text.NumberFormat;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

public class ConcatNode extends Node {
  private final DecimalFormatSymbols symbols;
  private final NumberFormat nf;

  private final int[] mInputIDs;

  public ConcatNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mInputIDs = Utils.processIntArray(config.getArray("input"));
    symbols = new DecimalFormatSymbols(Locale.getDefault());
    symbols.setDecimalSeparator('.');
    nf = new DecimalFormat("##.###", symbols);
  }

  @Override
  protected String evaluate() {
    StringBuilder builder = new StringBuilder();
    for (int i = 0; i < mInputIDs.length; i++) {
      Node inputNodes = mNodesManager.findNodeById(mInputIDs[i], Node.class);
      Object value = inputNodes.value();
      if (value instanceof Double) {
        builder.append(nf.format(value));
      } else {
        builder.append(value);
      }
    }
    return builder.toString();
  }
}
