package com.swmansion.reanimated.sharedElementTransition;

import android.view.View;

import com.swmansion.common.SharedElementAnimatorDelegate;
import com.swmansion.reanimated.layoutReanimation.AnimationsManager;
import com.swmansion.reanimated.layoutReanimation.Snapshot;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ScreensTransitionDelegate implements SharedElementAnimatorDelegate {
    private final AnimationsManager animationsManager;
    private final Map<String, List<SharedViewConfig>> sharedTransitionsItems = new HashMap<>();
    private final List<String> sharedElementsIterationOrder = new ArrayList<>();
    private final Map<Integer, Snapshot> snapshotRegistry = new HashMap<>();
    private final Set<Integer> toRestore = new HashSet<>();

    public ScreensTransitionDelegate(AnimationsManager animationsManager) {
        this.animationsManager = animationsManager;
    }

    @Override
    public void runTransition(View before, View after) {
        animationsManager.onViewTransition(
            before,
            after,
            snapshotRegistry.get(before.getId()),
            snapshotRegistry.get(after.getId())
        );
    }

    @Override
    public void onNativeAnimationEnd(View screen) {
        // restore state if you animate two objects
//        snapshotRegistry.get()
//        animationsManager.setNewProps();
        // przeiterować i usunąć wszystkie configi z toRemove == true
    }

    @Override
    public void makeSnapshot(View view) {
        snapshotRegistry.put(view.getId(), new Snapshot(view));
    }

    @Override
    public Map<String, List<SharedViewConfig>> getSharedTransitionItems() {
        return sharedTransitionsItems;
    }

    @Override
    public List<String> getSharedElementsIterationOrder() {
        return sharedElementsIterationOrder;
    }

    public void registerSharedTransitionTag(String sharedTransitionTag, int viewTag) {
        if (!sharedTransitionsItems.containsKey(sharedTransitionTag)) {
            sharedElementsIterationOrder.add(sharedTransitionTag);
            sharedTransitionsItems.put(sharedTransitionTag, new ArrayList<>());
        }
        List<SharedViewConfig> transitionItems = sharedTransitionsItems.get(sharedTransitionTag);
        assert transitionItems != null;
        transitionItems.add(new SharedViewConfig(viewTag));
    }

    public void unregisterSharedTransitionTag(String sharedTransitionTag, int viewTag) {
        List<SharedViewConfig> transitionItems = sharedTransitionsItems.get(sharedTransitionTag);
        assert transitionItems != null;
        for (SharedViewConfig config : transitionItems) {
            if (config.viewTag == viewTag) {
                config.toRemove = true;
            }
        }
    }
}
