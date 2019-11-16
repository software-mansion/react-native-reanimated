package com.swmansion.reanimated.nodes;

import android.util.Log;

import androidx.annotation.IntDef;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.ReactConstants;
import com.swmansion.reanimated.BuildConfig;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.reflection.CallbackWrapper;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

public class CallbackNode extends Node implements ValueManagerNode {

    private final int mWhatNodeID;

    public CallbackNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mWhatNodeID = config.getInt("what");
    }

    @Override
    public void setValue(Object value) {
        Node what = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        ((ValueManagerNode) what).setValue(value);
    }

    @Nullable
    @Override
    protected Object evaluate() {
        Node whatNode = mNodesManager.findNodeById(mWhatNodeID, Node.class);
        return new CallbackWrapper(whatNode);
    }
}
