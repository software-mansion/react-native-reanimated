package com.swmansion.reanimated.reflection;

import com.swmansion.reanimated.NodesManager;

public interface ReanimatedAccessor {
    public void call(int[] params, NodesManager nodesManager);
    public void connectToView(int viewTag);
}
