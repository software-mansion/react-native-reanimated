package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.Stack;

public class ParamNode extends ValueNode {

    private int mRefNode;
    private String mName;
    private Stack<Integer> mArgsStack;

    public ParamNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mName = config.getString("name");
        mArgsStack = new Stack<Integer>();
    }

    @Override
    public void setValue(Object value) {
        Node node = mNodesManager.findNodeById(mArgsStack.peek(), Node.class);
        if(node != null) {
            // Check instance
            if(node instanceof ValueNode) {
                ((ValueNode)node).setValue(value);
            }
        }
    }

    public void beginContext(Integer ref) {
        mArgsStack.push(ref);
    }

    public void endContext() {
        mArgsStack.pop();
    }


    @Override
    protected Object evaluate() {
        Node node = mNodesManager.findNodeById(mArgsStack.peek(), Node.class);
        return node.value();
    }
}
