package com.swmansion.reanimated.reflection;

import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.ConnectedNode;

public interface ReanimatedAccessor extends ConnectedNode {
    void call(int[] params, NodesManager nodesManager);
}
