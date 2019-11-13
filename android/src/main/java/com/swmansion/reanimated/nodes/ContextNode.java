package com.swmansion.reanimated.nodes;

public abstract interface ContextNode {
    public void beginContext(Integer ref, String prevCallID);
    public void endContext();
}
