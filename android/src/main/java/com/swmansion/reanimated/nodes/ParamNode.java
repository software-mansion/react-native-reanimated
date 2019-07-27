package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class ParamNode extends Node {

    private int mRefNode;
    private String mName;

    public ParamNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mRefNode = 0;
        mName = config.getString("name");
    }

    public void setNodeRef(int ref) {
        mRefNode = ref;
        Node node = mNodesManager.findNodeById(mRefNode, Node.class);
        if(node != null) {
            forceUpdateMemoizedValue((node.value()));
        } else {
            forceUpdateMemoizedValue((0));
        }
    }

    @Override
    protected Object evaluate() {
        Node node = mNodesManager.findNodeById(mRefNode, Node.class);
        if(node != null) {
            return node.value();
        } else {
            return 0;
        }
    }
}
