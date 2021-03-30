package com.swmansion.reanimated.layoutReanimation;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.LayoutShadowNode;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;

class ReaShadowNode extends LayoutShadowNode {
    public ReaShadowNode() {
        super();
    }

    @Override
    public void setReactTag(int reactTag) {
        super.setReactTag(reactTag);
        // TODO add to the registry
    }

}

public class AnimatedRootManager extends ViewGroupManager<AnimatedRoot> {
    @NonNull
    @Override
    public String getName() {
        return "REALayoutView";
    }

    @NonNull
    @Override
    protected AnimatedRoot createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new AnimatedRoot(reactContext);
    }

    public @NonNull LayoutShadowNode createShadowNodeInstance(@NonNull ReactApplicationContext context) {
        return new ReaShadowNode();
    }
}
