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

        attach();
    }



    public void attach() {
        eventDispatcherAccessor.attach(mNodeID, mEventName);
    }

    public void detach() {
        eventDispatcherAccessor.detach(mNodeID);
    }

    @Override
    public void setValue(Object value, ArrayList<CallFuncNode> context) {
        Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        ((ValueManagingNode) what).setValue(value, context);
    }

    @Nullable
    @Override
    protected Object evaluate() {
        return ZERO;
    }

    @NonNull
    @Override
    public String toString() {
        return String.format("%s(%s)", getClass().getSimpleName(), mEventName);
    }
}
