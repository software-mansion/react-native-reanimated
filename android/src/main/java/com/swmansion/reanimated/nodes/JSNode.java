package com.swmansion.reanimated.nodes;

import android.util.Log;

import com.eclipsesource.v8.V8Array;
import com.eclipsesource.v8.V8Object;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class JSNode extends Node {

    private final String mCode;
    private final int[] mArgs;
    private final String mFuncName;

    public JSNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mCode = config.getString("code");
        mArgs = Utils.processIntArray(config.getArray("args"));
        mFuncName = "update" + nodeID;
        nodesManager.jsRuntime.executeVoidScript("var " + mFuncName + " = " + mCode);
    }

    @Override
    protected Object evaluate() {

        V8Array args = new V8Array(mNodesManager.jsRuntime);
        for (int i = 0; i < mArgs.length; i++) {
            int argId = mArgs[i];
            Node argNode = mNodesManager.findNodeById(argId, Node.class);
            Object val = argNode.value();
            args.push((Double)val);
        }
        Double v = mNodesManager.jsRuntime.executeDoubleFunction(mFuncName, args);
        return v;
    }
}
