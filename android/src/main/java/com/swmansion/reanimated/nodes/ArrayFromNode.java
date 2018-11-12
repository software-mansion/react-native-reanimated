package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JavaOnlyArray;
import com.facebook.react.bridge.ReadableMap;
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
            res.pushDouble((Double) mNodesManager.findNodeById(el, Node.class).value());
        }
        return res;
    }
}
