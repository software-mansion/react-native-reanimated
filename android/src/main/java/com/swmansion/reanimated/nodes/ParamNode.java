package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.Stack;

public class ParamNode extends ValueNode {

  private int mRefNode;
  private String mName;
  private Stack<Object> mStack;

  public ParamNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mRefNode = 0;
    mName = config.getString("name");
    mStack = new Stack<Object>();
  }

  @Override
  public void setValue(Object value) {
    Node node = mNodesManager.findNodeById(mRefNode, Node.class);
    if (node != null) {
      // Check instance
      if (node instanceof ValueNode) {
        ((ValueNode) node).setValue(value);
      }
    }
  }

  public void beginContext(int ref) {
    mRefNode = ref;
    Node node = mNodesManager.findNodeById(mRefNode, Node.class);
    if (node != null) {
      mStack.push(node.value());
    } else {
      mStack.push(0);
    }
  }

  public void endContext() {
    forceUpdateMemoizedValue(mStack.pop());
  }


  @Override
  protected Object evaluate() {
    return mStack.peek();
  }
}
