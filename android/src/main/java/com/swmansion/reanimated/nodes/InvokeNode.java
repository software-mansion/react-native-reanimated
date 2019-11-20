package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.reflection.ReanimatedAccessor;
import com.swmansion.reanimated.reflection.ReanimatedReflectionHelper;

public class InvokeNode extends Node implements ConnectedNode {
    private ReanimatedAccessor mEvalHelper;
    private final int[] mParams;

    public InvokeNode(int nodeID, ReadableMap config, NodesManager nodesManager){
        super(nodeID, config, nodesManager);
        mEvalHelper = ReanimatedReflectionHelper.getInstance(nodesManager.getContext(), config);
        mParams = Utils.processIntArray(config.getArray("params"));
    }

    @Override
    protected Object evaluate() {
        mEvalHelper.call(mParams, mNodesManager);
        return ZERO;
    }

    @Override
    public void connectToView(int viewTag) {
        mEvalHelper.connectToView(viewTag);
    }

    @Override
    public void disconnectFromView(int viewTag) {
        mEvalHelper.disconnectFromView(viewTag);
    }
}