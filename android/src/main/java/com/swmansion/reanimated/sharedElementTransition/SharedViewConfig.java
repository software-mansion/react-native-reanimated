package com.swmansion.reanimated.sharedElementTransition;

import android.view.View;

public class SharedViewConfig {

    public Integer viewTag;
    public boolean toRemove;
    public View parentScreen;
    private View view;

    SharedViewConfig(Integer viewTag) {
        this.viewTag = viewTag;
    }

    public void setView(View view) {
        this.view = view;
    }

    public View getView() {
        View viewTmpReference = view;
        view = null;
        return viewTmpReference;
    }

}
