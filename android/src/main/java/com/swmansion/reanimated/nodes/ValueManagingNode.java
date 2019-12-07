package com.swmansion.reanimated.nodes;

import java.util.ArrayList;

import javax.annotation.Nullable;

public interface ValueManagingNode {
    void setValue(Object value, @Nullable ArrayList<CallFuncNode> context);
}
