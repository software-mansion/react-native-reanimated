package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class CallFuncNode extends Node {

    private int mWhatNodeID;
    private int[] mArgs;
    private int[] mParams;

    public CallFuncNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mWhatNodeID = config.getInt("what");
        mParams = Utils.processIntArray(config.getArray("params"));
        mArgs = Utils.processIntArray(config.getArray("args"));
    }

    private void beginContext() {
        mNodesManager.updateContext.contextCount++;
        for(int i=0; i<mParams.length; i++){
            int paramId = mParams[i];
            ParamNode paramNode = mNodesManager.findNodeById(paramId, ParamNode.class);
            paramNode.beginContext(mArgs[i]);
        }
    }

    private void endContext() {
        for(int i=0; i<mParams.length; i++){
            int paramId = mParams[i];
            ParamNode paramNode = mNodesManager.findNodeById(paramId, ParamNode.class);
            paramNode.endContext();
        }
        mNodesManager.updateContext.contextCount--;
    }

    @Override
    protected Object evaluate() {
        beginContext();
        Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        Object retVal = whatNode.value();
        endContext();
        return retVal;
    }
}
