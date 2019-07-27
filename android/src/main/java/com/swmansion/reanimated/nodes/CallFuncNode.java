package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ParamNode;

public class CallFuncNode extends Node {

    private int mWhatNodeID;
    private int[] mArgs;
    private int[] mParams;
    private double[] mPrevArgs;

    public CallFuncNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mWhatNodeID = config.getInt("what");
        mParams = Utils.processIntArray(config.getArray("params"));
        mArgs = Utils.processIntArray(config.getArray("args"));
        mPrevArgs = new double[mArgs.length];
    }

    private void beginContext() {
        for(int i=0; i<mParams.length; i++){
            int paramId = mParams[i];
            ParamNode node = mNodesManager.findNodeById(paramId, ParamNode.class);
            mPrevArgs[i] = node.doubleValue();
            node.setNodeRef(mArgs[i]);
        }
    }

    private void endContext() {
        for(int i=0; i<mParams.length; i++){
            int paramId = mParams[i];
            ParamNode node = mNodesManager.findNodeById(paramId, ParamNode.class);
            node.setNodeRef((int)mPrevArgs[i]);
        }
    }

    @Override
    protected Object evaluate() {
        beginContext();
        Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        Object retVal = whatNode.evaluate();
        endContext();
        return retVal;
    }
}
