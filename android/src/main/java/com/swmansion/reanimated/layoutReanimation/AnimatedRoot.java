package com.swmansion.reanimated.layoutReanimation;

import android.content.Context;

import com.facebook.react.views.view.ReactViewGroup;

public class AnimatedRoot extends ReactViewGroup {
    public boolean shouldBeAnimated = true;
    public boolean isShallow = false;

    public AnimatedRoot(Context context) {
        super(context);
    }
}
