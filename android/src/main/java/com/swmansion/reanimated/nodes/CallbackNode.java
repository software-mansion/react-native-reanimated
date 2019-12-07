package com.swmansion.reanimated.nodes;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.reflection.ReanimatedCallback;

import java.util.ArrayList;

public class CallbackNode extends Node implements ValueManagingNode {

    private final int mWhatNodeID;
    private final ReanimatedCallback mCallbackWrapper;
    private ArrayList<CallFuncNode> mContext;

    public CallbackNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mWhatNodeID = config.getInt("what");
        mCallbackWrapper = new ReanimatedCallback(this);
    }

    @Override
    public void setValue(final Object value) {
        Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        ((ValueManagingNode) what).setValue(value);
    }

    @Override
    protected void propagateContext(ArrayList<CallFuncNode> context) {
        mContext = context;
        super.propagateContext(context);
    }

    @Nullable
    @Override
    protected Object evaluate() {
        if (mContext != null) {
            ValueManagingNode provider = new ContextProvider.ValueManager(this, mContext);
            mContext = null;
            return new ReanimatedCallback(provider);
        } else {
            return mCallbackWrapper;
        }
    }
}
