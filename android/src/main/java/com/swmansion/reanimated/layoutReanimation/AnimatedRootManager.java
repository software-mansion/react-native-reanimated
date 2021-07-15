package com.swmansion.reanimated.layoutReanimation;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.LayoutShadowNode;
import com.facebook.react.uimanager.NativeViewHierarchyOptimizer;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.UIImplementation;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.uimanager.annotations.ReactPropGroup;
import com.facebook.react.uimanager.events.EventDispatcher;

class ReaShadowNode extends LayoutShadowNode {
    public ReaShadowNode() {
        super();
    }

    @Override
    public void setReactTag(int reactTag) {
        super.setReactTag(reactTag);
        ReactBatchObserver.animatedRoots.add(reactTag);
    }

    @Override
    public void onBeforeLayout(NativeViewHierarchyOptimizer nativeViewHierarchyOptimizer) {
        super.onBeforeLayout(nativeViewHierarchyOptimizer);
        if (this.hasUpdates()) {
           // ReactBatchObserver.affectedAnimatedRoots.add(this.getReactTag());
        }
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

    @ReactProp(name = "animated")
    public void setAnimated(AnimatedRoot view, boolean animated) {
        view.shouldBeAnimated = animated;
    }

    @ReactProp(name = "isShallow")
    public void setShallow(AnimatedRoot view, boolean shallow) {
        view.isShallow = shallow;
    }
}
