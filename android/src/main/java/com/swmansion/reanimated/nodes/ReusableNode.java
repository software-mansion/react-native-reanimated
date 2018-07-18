package com.swmansion.reanimated.nodes;


import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.ArrayList;

public class ReusableNode extends Node {

  private final int mAnchorNode;
  private final int[] mAnchorInput;

  public ReusableNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mAnchorNode = config.getInt("anchor");


    ArrayList anchorInput = (config.getArray("anchorInput").toArrayList());
    ArrayList<Integer> anchorListConverted = new ArrayList<>();
    for (Object ids: anchorInput) {
      if(ids instanceof Double) {
        anchorListConverted.add(((Double)ids).intValue());
      }
    }
    mAnchorInput = new int [anchorListConverted.size()];
    int i = 0;
    for (Integer id : anchorListConverted) {
      mAnchorInput[i] = id;
      i++;
    }

  }

  public void setInputNodes(int [] nodes){
    for (int i = 0; i < nodes.length; i++) {
      ValueNode nodeToBeSet = mNodesManager.findNodeById(mAnchorInput[i], ValueNode.class);
      Node<Double> nodesWhichValueIsToBeSet = (Node<Double>)mNodesManager.findNodeById(nodes[i], Node.class);
      nodeToBeSet.markReusing();
      nodeToBeSet.setValue(nodesWhichValueIsToBeSet.evaluate());
    }
  }

  @Override
  protected Object evaluate() {
   /* Object cond = mNodesManager.getNodeValue(mCondID);
    if (cond instanceof Number && ((Number) cond).doubleValue() != 0.0) {
      // This is not a good way to compare doubles but in this case it is what we want
      return mIfBlockID != -1 ? mNodesManager.getNodeValue(mIfBlockID) : ZERO;
    }
    return mElseBlockID != -1 ? mNodesManager.getNodeValue(mElseBlockID) : ZERO;*/
   return mNodesManager.findNodeById(mAnchorNode, Node.class).evaluate();
  }
}
