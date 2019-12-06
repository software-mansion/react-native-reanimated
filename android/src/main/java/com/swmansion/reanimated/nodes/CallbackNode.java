package com.swmansion.reanimated.nodes;

import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.reflection.ReanimatedCallback;

public class CallbackNode extends Node implements ValueManagingNode {

    private final int mWhatNodeID;
    private final ReanimatedCallback mCallbackWrapper;

    public CallbackNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mWhatNodeID = config.getInt("what");
        mCallbackWrapper = new ReanimatedCallback(this);
    }

    @Override
    public void setValue(final Object value) {
        Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        ((ValueManagingNode) what).setValue(value);
        what.value();
    }

    @Nullable
    @Override
    protected Object evaluate() {
        return mCallbackWrapper;
    }

}
