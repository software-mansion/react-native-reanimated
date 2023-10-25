package com.swmansion.common;

public interface ScreenTransitionManager {
    int[] startTransition(int stackTag);
    void updateTransition(int stackTag, double progress);
    void finishTransition(int stackTag, boolean canceled);
}
