package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

public class CallMapNode extends CallFuncNode implements ContextNode {

    public CallMapNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        MapNode mapNode = mNodesManager.findNodeById(mWhatNodeID, Node.class).source(MapNode.class);
        for (int i = 0; i < mapNode.mMapping.size(); i++) {
            int paramId = mapNode.mMapping.get(i).nodeID;
            mParams[i] = paramId;
        }
    }

    @Override
    public void beginContext(Integer ref, String prevCallID) {
        //  noop
    }

    @Override
    public void endContext() {
        super.endContext();
        //  noop
        //  we should wait for callbacks to resolve
    }

    public void setValue(Object value) {
        beginContext();
        MapNode whatNode = mNodesManager.findNodeById(mWhatNodeID, MapNode.class);
        whatNode.setValue(value);
        endContext();//super.endContext();
    }
}
