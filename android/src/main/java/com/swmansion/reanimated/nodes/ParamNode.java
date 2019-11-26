package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.EmptyStackException;
import java.util.Stack;

public class ParamNode extends ValueNode implements ContextNode {

  private final Stack<Integer> mArgsStack;
  private String mPrevCallID;

  public ParamNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mArgsStack = new Stack<>();
  }

  @Override
  public void setValue(Object value) {
    try {
      Node node = mNodesManager.findNodeById(mArgsStack.peek(), Node.class);
      String callID = mUpdateContext.callID;
      mUpdateContext.callID = mPrevCallID;
      ((ValueManagingNode) node).setValue(value);
      mUpdateContext.callID = callID;
    } catch (EmptyStackException e) {
      throw new JSApplicationCausedNativeException(getClass().getSimpleName() + " is trying to set value with no context.", e);
    }
  }

  @Override
  public void beginContext(Integer ref, String prevCallID) {
    mPrevCallID = prevCallID;
    mArgsStack.push(ref);
  }

  @Override
  public void endContext() {
    mArgsStack.pop();
  }


  @Override
  protected Object evaluate() {
    try {
      String callID = mUpdateContext.callID;
      mUpdateContext.callID = mPrevCallID;
      Node node = mNodesManager.findNodeById(mArgsStack.peek(), Node.class);
      Object val = node.value();
      mUpdateContext.callID = callID;
      return val;
    } catch (EmptyStackException e) {
      throw new JSApplicationCausedNativeException(getClass().getSimpleName() + " is trying to evaluate with no context.\n" +
              "It seems you are trying to use `callback` inside `proc`. This is not yet supported.",
              e);
    }
  }
}
