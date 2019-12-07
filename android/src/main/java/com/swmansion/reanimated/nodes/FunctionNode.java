package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.ArrayList;

import javax.annotation.Nullable;

public class FunctionNode extends Node implements ValueManagingNode {

  private final int mWhatNodeID;

  public FunctionNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mWhatNodeID = config.getInt("what");
  }

  @Override
  protected Object evaluate() {
    Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    return what.value();
  }

  @Override
  public void setValue(Object value, ArrayList<CallFuncNode> context) {
    Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    try {
      ((ValueManagingNode) what).setValue(value, context);
    } catch (Throwable throwable) {
      throw new JSApplicationCausedNativeException(
              "Error while trying to set value on reanimated " + what.getClass().getSimpleName(), throwable);
    }
  }

}
