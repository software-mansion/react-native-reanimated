package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class CallbackNode extends MapNode implements Callback {

    public CallbackNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
    }

    @Override
    public void invoke(Object... args) {
        setValue(((WritableMap) Utils.toWritableArray(args)));
    }
}
