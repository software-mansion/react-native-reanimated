package com.swmansion.common;

import android.view.View;

public class SharedTransitionConfig {
    public View fromView;
    public View toView;
    public View fromViewParent;
    public SharedTransitionConfig(View fromView, View toView, View fromViewParent) {
        this.fromView = fromView;
        this.toView = toView;
        this.fromViewParent = fromViewParent;
    }
}
