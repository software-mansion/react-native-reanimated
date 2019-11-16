package com.swmansion.reanimated.nodes;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.reflection.CallbackWrapper;

public class CallbackNode extends Node implements ValueManagingNode {

    private final int mWhatNodeID;

    public CallbackNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mWhatNodeID = config.getInt("what");
    }

    @Override
    public void setValue(Object value) {
        Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        ((ValueManagingNode) what).setValue(value);
    }

    @Nullable
    @Override
    protected Object evaluate() {
        Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        return new CallbackWrapper(whatNode);
    }
}
