package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JavaOnlyArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.ReadableArray;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class ArrayFromNode extends Node {

    private final int[] mArrayFrom;

    public ArrayFromNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mArrayFrom = Utils.processIntArray(config.getArray("arrayFrom"));
    }

    @Override
    protected Object evaluate() {
        JavaOnlyArray res = new JavaOnlyArray();
        for (int el: mArrayFrom) {
            Object value = mNodesManager.findNodeById(el, Node.class).value();

            // it's here to match objc implementation that can handle any type
            if (value == null) {
                res.pushNull();
            } else if (value instanceof Number) {
                res.pushDouble((Double) value);
            } else if (value instanceof String) {
                res.pushString((String) value);
            } else if (value instanceof Boolean) {
                res.pushBoolean((Boolean) value);
            } else if (value instanceof ReadableArray) {
                res.pushArray((WritableArray) value);
            } else {
                throw new IllegalArgumentException("Unexpected type " + value.getClass().getName() + " inside arrayFrom node");
            }
        }
        return res;
    }
}
