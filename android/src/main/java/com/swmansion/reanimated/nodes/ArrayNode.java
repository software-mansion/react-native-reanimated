package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JavaOnlyArray;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class ArrayNode extends Node {

    private final int[] mArray;

    public ArrayNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mArray = Utils.processIntArray(config.getArray("array"));
    }

    @Override
    protected Object evaluate() {
        JavaOnlyArray res = new JavaOnlyArray();
        for (int el: mArray) {
            res.pushDouble((Double) mNodesManager.findNodeById(el, Node.class).value());
        }
        return res;
    }
}
