package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class CallMapNode extends CallFuncNode implements ValueManagerNode {

    private final int mMapNodeID;

    public CallMapNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mMapNodeID = config.getInt("map");

        MapNode mapNode = mNodesManager.findNodeById(mMapNodeID, MapNode.class);
        for (int i = 0; i < mapNode.mMapping.size(); i++) {
            int paramId = mapNode.mMapping.get(i).nodeID;
            mParams[i] = paramId;
        }
    }

    public void setValue(Object value) {
        beginContext();
        Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        ((ValueManagerNode) whatNode).setValue(value);
        endContext();
    }

}
