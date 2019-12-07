package com.swmansion.reanimated.nodes;

import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.JSApplicationCausedNativeException;
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
    public void setValue(final Object value, ArrayList<CallFuncNode> context) {
        Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        ((ValueManagingNode) what).setValue(value, context);
    }
private Object mValue;
    @Override
    protected void propagateContext(ArrayList<CallFuncNode> context) {
        Log.d("Invoke", "propagateContext from callback: " + context.get(context.size() - 1).mNodeID);
        mContext = context;
        ValueManagingNode provider = new ContextProvider.ValueManagingContextProvider(this, mContext);
        //mContext = null;
        mValue = new ReanimatedCallback(provider);
        //mUpdateContext.callID = mNodesManager.updateContext.callID;
        super.propagateContext(context);
    }

    @Nullable
    @Override
    protected Object evaluate() {
        Log.d("Invoke", "callback context: " + mContext + "     " + mValue +"    " + mUpdateContext);

        if (mContext != null) {
            ValueManagingNode provider = new ContextProvider.ValueManagingContextProvider(this, mContext);
            //mContext = null;
            return new ReanimatedCallback(provider);
        } else {
            return new ReanimatedCallback(new ValueManagingNode() {
                @Override
                public void setValue(Object value, @javax.annotation.Nullable ArrayList<CallFuncNode> context) {
                    Log.d("Invoke", "callback context: " + mContext + "     " + mValue);
                }
            });
            //return mCallbackWrapper;
            //throw new JSApplicationCausedNativeException("what the fuck?");
        }
    }
}
