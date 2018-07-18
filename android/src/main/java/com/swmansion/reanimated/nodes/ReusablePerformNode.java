package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.ArrayList;

public class ReusablePerformNode extends Node {

  private final int mReusableNode;
  private final int[] mArguments;

  public ReusablePerformNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mReusableNode = config.getInt("reusableNode");
    ArrayList anchorInput = (config.getArray("args").toArrayList());
    ArrayList<Integer> anchorListConverted = new ArrayList<>();
    for (Object ids: anchorInput) {
      if(ids instanceof Double) {
        anchorListConverted.add(((Double)ids).intValue());
      }
    }
    mArguments = new int [anchorListConverted.size()];
    int i = 0;
    for (Integer id : anchorListConverted) {
      mArguments[i] = id;
      i++;
    }
  }

  @Override
  protected Object evaluate() {
   ReusableNode reusableNode = mNodesManager.findNodeById(mReusableNode, ReusableNode.class);
   reusableNode.setInputNodes(mArguments);
   return reusableNode.evaluate();
  }
}
