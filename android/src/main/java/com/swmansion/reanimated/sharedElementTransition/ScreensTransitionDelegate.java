package com.swmansion.reanimated.sharedElementTransition;

import android.view.View;

import com.swmansion.common.SharedElementAnimatorDelegate;
import com.swmansion.reanimated.layoutReanimation.AnimationsManager;

public class ScreensTransitionDelegate implements SharedElementAnimatorDelegate {
    private final AnimationsManager animationsManager;

    public ScreensTransitionDelegate(AnimationsManager animationsManager) {
        this.animationsManager = animationsManager;
    }

    @Override
    public void runTransition(View before, View after) {
        animationsManager.onViewTransition(before, after);
    }

    public int registerSharedTransitionTag(String sharedTransitionTag, int viewTag) {
        // TODO: implement
        return 0;
    }

    public void unregisterSharedTransitionTag(String sharedTransitionTag, int viewTag) {
        // TODO: implement
    }
}
