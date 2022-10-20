package com.swmansion.reanimated.sharedElementTransition;

import android.content.Context;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.coordinatorlayout.widget.CoordinatorLayout;

public class ReanimatedCoordinatorLayout extends CoordinatorLayout {

    public ReanimatedCoordinatorLayout(Context context) {
        super(context);
    }

    @Override
    public void onMeasureChild(
        View child,
        int parentWidthMeasureSpec,
        int widthUsed,
        int parentHeightMeasureSpec,
        int heightUsed
    ) {
        /*
            we want to prevent `measure` on shared element transition item
            because it breaks the first couple frames of animation
        */
    }

    @Override
    public void onLayoutChild(@NonNull View child, int layoutDirection) {
        /*
            we want to prevent `layout` on shared element transition item
            because it breaks the first couple frames of animation
        */
    }
}