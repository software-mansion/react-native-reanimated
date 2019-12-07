package com.swmansion.reanimated.nodes;

import android.util.Log;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.reflection.ReanimatedBridge;
import com.swmansion.reanimated.reflection.ReanimatedReflectionHelper;

import java.util.ArrayList;

public class InvokeNode extends Node implements ConnectedNode {
    private final ReanimatedBridge.ReanimatedAccessor mEvalHelper;
    private final int[] mParams;

    public InvokeNode(int nodeID, ReadableMap config, NodesManager nodesManager){
        super(nodeID, config, nodesManager);
        mEvalHelper = ReanimatedReflectionHelper.getInstance(nodesManager.getContext(), config);
        mParams = Utils.processIntArray(config.getArray("params"));
    }

    @Override
    protected void propagateContext(ArrayList<CallFuncNode> context) {
        Log.d("Invoke", "propagateContext from invoke: " + context);
        super.propagateContext(context);
    }

    @Override
    protected Object evaluate() {
        Log.d("Invoke", "evaluate invoke: " + mUpdateContext);
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