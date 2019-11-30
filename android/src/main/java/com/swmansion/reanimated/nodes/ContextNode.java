package com.swmansion.reanimated.nodes;

interface ContextNode {
    void beginContext(Integer ref, String prevCallID);
    void endContext();
}
