package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.reflection.ReanimatedAccessor;
import com.swmansion.reanimated.reflection.ReanimatedReflectionHelper;

public class InvokeNode extends Node implements ConnectedNode {
    ReanimatedAccessor mEvalHelper;
    protected final int[] mParams;
    private int invocationId = 0;

    public InvokeNode(int nodeID, ReadableMap config, NodesManager nodesManager){
        super(nodeID, config, nodesManager);
        mEvalHelper = ReanimatedReflectionHelper.getInstance(nodesManager.getContext(), config);
        mParams = Utils.processIntArray(config.getArray("params"));
    }

    @Override
    protected Object evaluate() {
        mEvalHelper.call(mParams, mNodesManager);

        invocationId++;
        return invocationId;
    }

    @Override
    public void connectToView(int viewTag) {
        mEvalHelper.connectToView(viewTag);
    }

}