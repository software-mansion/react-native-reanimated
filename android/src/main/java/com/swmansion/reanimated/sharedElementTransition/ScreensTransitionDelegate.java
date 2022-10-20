package com.swmansion.reanimated.sharedElementTransition;

import android.content.Context;
import android.view.View;

import androidx.coordinatorlayout.widget.CoordinatorLayout;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.common.UIManagerType;
import com.swmansion.common.ScreenStackFragmentCommon;
import com.swmansion.common.SharedElementAnimatorDelegate;
import com.swmansion.common.SharedTransitionConfig;
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
    private final Set<Integer> sharedElementsTags = new HashSet<>();

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
    public void onNativeAnimationEnd(View screen, List<View> toRemove) {
        for (View view : toRemove) {
            int viewTag = view.getId();
            animationsManager.stopAnimation(viewTag);
            Snapshot snapshot = snapshotRegistry.get(viewTag);
            if (snapshot != null) {
                animationsManager.updateProps(snapshot.toBasicMap(), viewTag);
            }
        }
        for (Map.Entry<String, List<SharedViewConfig>> tagGroupEntry : sharedTransitionsItems.entrySet()) {
            List<SharedViewConfig> tagGroup = tagGroupEntry.getValue();
            for (SharedViewConfig sharedViewConfig : tagGroup) {
                if (sharedViewConfig.toRemove) {
                    tagGroup.remove(sharedViewConfig);
                }
            }
            if (tagGroup.isEmpty()) {
                sharedTransitionsItems.remove(tagGroupEntry.getKey());
            }
        }
    }

    @Override
    public void makeSnapshot(View view) {
        snapshotRegistry.put(view.getId(), new Snapshot(view));
    }

    @Override
    public List<String> getSharedElementsIterationOrder() {
        return sharedElementsIterationOrder;
    }

    @Override
    public boolean isTagUnderTransition(int viewTag) {
        return sharedElementsTags.contains(viewTag);
    }

    @Override
    public List<SharedTransitionConfig> getSharedElementsForCurrentTransition(View currentScreen, View targetScreen) {
        List<SharedTransitionConfig> sharedElements = new ArrayList<>();
        UIManager uiManager = UIManagerHelper.getUIManager(
            (ReactContext)currentScreen.getContext(),
            UIManagerType.DEFAULT
        );
        if (uiManager == null) {
            return sharedElements;
        }
        int listSize = sharedElementsIterationOrder.size();
        for (int i = listSize - 1; i >= 0; i--) {
            String sharedTransitionTag = sharedElementsIterationOrder.get(i);
            List<SharedViewConfig> transitionGroup = sharedTransitionsItems.get(sharedTransitionTag);
            if (transitionGroup == null) {
                continue;
            }
            View fromView = null;
            View toView = null;
            View fromViewParent = null;
            for (SharedViewConfig viewConfig : transitionGroup) {
                boolean isInViewTree = true;
                View view;
                try {
                    view = uiManager.resolveView(viewConfig.viewTag);
                    viewConfig.view = view;
                } catch (Exception e) {
                    view = viewConfig.view;
                    isInViewTree = false;
                }
                if (view.getParent() != null) {
                    viewConfig.setParent((View)view.getParent());
                }
                if (isInSubtreeOf(view, currentScreen, viewConfig.parentScreen)) {
                    fromView = view;
                    viewConfig.parentScreen = currentScreen;
                    if (view.getParent() != null) {
                        fromViewParent = (View)view.getParent();
                    } else {
                        fromViewParent = viewConfig.getParent();
                    }
                    if (isInViewTree) {
                        makeSnapshot(view);
                    }
                }
                else if (isInSubtreeOf(view, targetScreen, viewConfig.parentScreen)) {
                    toView = view;
                    viewConfig.parentScreen = targetScreen;
                }
            }

            if (fromView != null && toView != null && fromViewParent != null) {
                sharedElements.add(
                    new SharedTransitionConfig(fromView, toView, fromViewParent)
                );
            }
        }

        return sharedElements;
    }

    @Override
    public CoordinatorLayout getTransitionContainer(Context context) {
        return new ReanimatedCoordinatorLayout(context);
    }

    @Override
    public CoordinatorLayout getAnimationCoordinatorLayout(
        Context context,
        ScreenStackFragmentCommon fragment
    ) {
        return new ScreensCoordinatorLayout(context, fragment, this);
    }

    private boolean isInSubtreeOf(View child, View root, View parentScreen) {
        if (root == null || child == null) {
            return false;
        }
        if (child.getParent() == null && parentScreen != null && root == parentScreen) {
            return true;
        }
        return (child.getParent() == root) || isInSubtreeOf((View)child.getParent(), root, null);
    }

    public void registerSharedTransitionTag(String sharedTransitionTag, int viewTag) {
        if (!sharedTransitionsItems.containsKey(sharedTransitionTag)) {
            sharedElementsIterationOrder.add(sharedTransitionTag);
            sharedTransitionsItems.put(sharedTransitionTag, new ArrayList<>());
        }
        List<SharedViewConfig> transitionItems = sharedTransitionsItems.get(sharedTransitionTag);
        assert transitionItems != null;
        transitionItems.add(new SharedViewConfig(viewTag));
        sharedElementsTags.add(viewTag);
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
