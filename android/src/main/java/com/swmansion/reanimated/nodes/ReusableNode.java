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

  @Override
  protected void markReusing() {
    mIsReusing = true;
  }

  public void setInputNodes(int [] nodes){
    for (int i = 0; i < nodes.length; i++) {
      ValueNode nodeToBeSet = mNodesManager.findNodeById(mAnchorInput[i], ValueNode.class);
      Node<Double> nodesWhichValueIsToBeSet = (Node<Double>)mNodesManager.findNodeById(nodes[i], Node.class);
      nodeToBeSet.markReusing();
      nodeToBeSet.setValue(nodesWhichValueIsToBeSet.value());
    }
  }

  public void setArguments(int [] nodes){
    for (int i = 0; i < nodes.length; i++) {
      Node<Double> nodeToBeSet = (Node<Double>)mNodesManager.findNodeById(nodes[i], Node.class);
      if (!(nodeToBeSet instanceof ValueNode)) {
        continue;
      }

      ValueNode nodeWhichValueIsToBeSet = mNodesManager.findNodeById(mAnchorInput[i], ValueNode.class);
      Double valueToBeSetWith = nodeWhichValueIsToBeSet.value();
      if (valueToBeSetWith == null || nodeToBeSet.value().equals(valueToBeSetWith)) {
        continue;
      }
      ((ValueNode)nodeToBeSet).setValue(valueToBeSetWith);
    }
  }

  @Override
  protected Object evaluate() {
   return mNodesManager.findNodeById(mAnchorNode, Node.class).value();
  }
}
