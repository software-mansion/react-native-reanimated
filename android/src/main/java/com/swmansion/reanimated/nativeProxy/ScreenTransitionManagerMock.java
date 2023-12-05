package com.swmansion.reanimated.nativeProxy;

import com.swmansion.common.ScreenTransitionManager;

public class ScreenTransitionManagerMock implements ScreenTransitionManager {

    @Override
    public int[] startTransition(int stackTag) {
        return new int[] {-1, -1};
    }

    @Override
    public void updateTransition(int stackTag, double progress) {}

    @Override
    public void finishTransition(int stackTag, boolean canceled) {}
}
