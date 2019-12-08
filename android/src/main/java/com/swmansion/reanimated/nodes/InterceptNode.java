package com.swmansion.reanimated.nodes;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.reflection.JSEventDispatcherAccessor;

import java.util.ArrayList;

import javax.annotation.Nullable;

public class InterceptNode extends Node implements ValueManagingNode {

    private final int mWhatNodeID;
    private final String mEventName;
    private final JSEventDispatcherAccessor eventDispatcherAccessor;
    private boolean mIsAttached = false;
    private ArrayList<CallFuncNode> mContext;

    public InterceptNode(int nodeID, @Nullable ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mWhatNodeID = config.getInt("what");
        mEventName = config.getString("event");

        Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        if (!(what instanceof ValueManagingNode)) {
            throw new JSApplicationIllegalArgumentException(
                    String.format("Unsupported node type %s passed to %s", what.getClass().getSimpleName(), getClass().getSimpleName())
            );
        }

        eventDispatcherAccessor = mNodesManager.getReflectionHelper().JSEventDispatcher();
    }

    @Override
    public void setValue(Object value) {
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
        if (!mIsAttached) {
            ValueManagingNode valueManager;
            if (mContext != null) {
                valueManager = new ContextProvider.ValueManager(this, mContext);
                mContext = null;
            } else {
                valueManager = this;
                mIsAttached = true;
            }
            eventDispatcherAccessor.attach(mEventName, valueManager);
        }

        return ZERO;
    }

    @Override
    public Object exportableValue() {
        return ZERO;
    }

    @NonNull
    @Override
    public String toString() {
        return String.format("%s('%s')", getClass().getSimpleName(), mEventName);
    }
}
