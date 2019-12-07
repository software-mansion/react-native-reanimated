package com.swmansion.reanimated.nodes;

import android.util.Log;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

import java.util.ArrayList;

public class CallFuncNode extends Node implements ValueManagingNode {

  private String mPreviousCallID;
  private final int mWhatNodeID;
  private final int[] mArgs;
  private final int[] mParams;

  public CallFuncNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mWhatNodeID = config.getInt("what");
    mParams = Utils.processIntArray(config.getArray("params"));
    mArgs = Utils.processIntArray(config.getArray("args"));
  }

  protected void beginContext() {
    mPreviousCallID = mNodesManager.updateContext.callID;
    mNodesManager.updateContext.callID = mNodesManager.updateContext.callID + '/' + mNodeID;
    for (int i = 0; i < mParams.length; i++) {
      int paramId = mParams[i];
      ParamNode paramNode = mNodesManager.findNodeById(paramId, ParamNode.class);
      paramNode.beginContext(mArgs[i], mPreviousCallID);
    }
  }

  protected void endContext() {
    for (int i = 0; i < mParams.length; i++) {
      int paramId = mParams[i];
      ParamNode paramNode = mNodesManager.findNodeById(paramId, ParamNode.class);
      paramNode.endContext();
    }
    mNodesManager.updateContext.callID = mPreviousCallID;
  }

  private void beginContextPropagation() {
    propagateContext(new ArrayList<CallFuncNode>());
  }

  @Override
  protected void propagateContext(ArrayList<CallFuncNode> context) {
    context.add(this);
    Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    super.propagateContext(context);
    whatNode.propagateContext(context);
  }

  @Override
  public void setValue(Object value, ArrayList<CallFuncNode> context) {
    beginContext();
    Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    ((ValueManagingNode) whatNode).setValue(value, context);
    endContext();
  }

  @Override
  protected Object evaluate() {
    beginContext();
    beginContextPropagation();
    Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    Object retVal = whatNode.value();
    endContext();
    return retVal;
  }
}
