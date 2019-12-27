package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

import java.util.ArrayList;

public class CallFuncNode extends Node implements ValueManagingNode {

  private String mPreviousCallID;
  private final int mWhatNodeID;
  private final int[] mArgs;
  private final int[] mParams;
  private final ArrayList<CallFuncNode> mContext;

  public CallFuncNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mWhatNodeID = config.getInt("what");
    mParams = Utils.processIntArray(config.getArray("params"));
    mArgs = Utils.processIntArray(config.getArray("args"));
    mContext = new ArrayList<>();
  }

  void beginContext() {
    mPreviousCallID = mNodesManager.updateContext.callID;
    mNodesManager.updateContext.callID = mNodesManager.updateContext.callID + '/' + mNodeID;
    for (int i = 0; i < mParams.length; i++) {
      int paramId = mParams[i];
      ParamNode paramNode = mNodesManager.findNodeById(paramId, ParamNode.class);
      paramNode.beginContext(mArgs[i], mPreviousCallID);
    }
  }

  void endContext() {
    for (int i = 0; i < mParams.length; i++) {
      int paramId = mParams[i];
      ParamNode paramNode = mNodesManager.findNodeById(paramId, ParamNode.class);
      paramNode.endContext();
    }
    mNodesManager.updateContext.callID = mPreviousCallID;
  }

  private void beginContextPropagation() {
    propagateContext(mContext);
  }

  private void endContextPropagation() {
    mContext.clear();
  }

  @Override
  protected void propagateContext(ArrayList<CallFuncNode> context) {
    if (!mContext.equals(context)) {
      mContext.addAll(context);
    }
    context.add(this);
    Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    super.propagateContext(context);
    whatNode.propagateContext(context);
  }

  @Override
  public void setValue(Object value) {
    beginContext();
    Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    ((ValueManagingNode) whatNode).setValue(value);
    endContext();
  }

  @Override
  protected Object evaluate() {
    beginContext();
    beginContextPropagation();
    Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    Object retVal = whatNode.value();
    endContextPropagation();
    endContext();
    return retVal;
  }

  @Override
  public Object exportableValue() {
    Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
    return what.exportableValue();
  }
}
