package com.swmansion.reanimated.nodes;

public interface ConnectedNode {
    void connectToView(int viewTag);
    void disconnectFromView(int viewTag);
}
