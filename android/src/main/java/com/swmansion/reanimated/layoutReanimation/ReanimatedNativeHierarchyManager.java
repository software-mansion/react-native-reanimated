package com.swmansion.reanimated.layoutReanimation;

import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.RootViewManager;
import com.facebook.react.uimanager.ViewAtIndex;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.uimanager.ViewManagerRegistry;
import com.swmansion.reanimated.ReanimatedModule;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;

public class ReanimatedNativeHierarchyManager extends NativeViewHierarchyManager {
    private AnimationsManager mAnimationsManager = null;
    private HashMap<Integer, HashSet<View>> mDisappearing = new HashMap<>();

    public ReanimatedNativeHierarchyManager(ViewManagerRegistry viewManagers, ReactApplicationContext reactContext) {
        super(viewManagers);
        ReanimatedModule reanimatedModule = reactContext.getNativeModule(ReanimatedModule.class);
        mAnimationsManager = reanimatedModule.getNodesManager().getReactBatchObserver().getAnimationsManager();
        mAnimationsManager.setReanimatedNativeHierarchyManager(this);
    }

    public ReanimatedNativeHierarchyManager(ViewManagerRegistry viewManagers, RootViewManager manager) {
        super(viewManagers, manager);
    }

    public void removeView(ViewGroup parent, View view) {
        removeDisappearing(parent);
        mDisappearing.get(parent.getId()).remove(view);
        addDisappearing(parent);
    }

    @Override
    public synchronized void manageChildren(int tag, @Nullable int[] indicesToRemove, @Nullable ViewAtIndex[] viewsToAdd, @Nullable int[] tagsToDelete) {
        //children: [child1, child2,...,childS| disappearingChild1, disappearingChild2...disappearingChildK]
        //View view = resolveView(tag);
        //removeDisappearing(view);
        //notifyAboutRemoval(view, indicesToRemove, tagsToDelete);
        super.manageChildren(tag, indicesToRemove, viewsToAdd, tagsToDelete);
        //addDisappearing(view);
    }

    private void addDisappearing(View view) {
        if (!(view instanceof ViewGroup)) return;
        ViewGroupManager vm = (ViewGroupManager) resolveViewManager(view.getId());
        HashSet<View> disappearingChildren = mDisappearing.get(view.getId());
        vm.addViews((ViewGroup) view, new ArrayList<>(disappearingChildren));
    }

    private void notifyAboutRemoval(View view, int[] indicesToRemove, @Nullable int[] tagsToDelete) {
        if (!(view instanceof ViewGroup) || indicesToRemove == null || tagsToDelete == null) return;
        ViewGroup vg = (ViewGroup) view;
        int i = 0;
        for (int index : indicesToRemove) {
            ViewGroupManager vm = (ViewGroupManager) resolveViewManager(view.getId());
            View viewToRemove = vm.getChildAt(vg, index);
            mAnimationsManager.onViewRemoval(viewToRemove, vg, new Snapshot(viewToRemove, this));
            if (!mDisappearing.containsKey(view.getId())) {
                mDisappearing.put(view.getId(), new HashSet<View>());
            }
            mDisappearing.get(view.getId()).add(viewToRemove);
            i++;
        }
    }

    private void removeDisappearing(View view) {
        if (!(view instanceof ViewGroup)) return;
        ViewGroupManager vm = (ViewGroupManager) resolveViewManager(view.getId());
        HashSet<View> disappearingChildren = mDisappearing.get(view.getId());
        int disappearingCount = disappearingChildren.size();
        while ((disappearingCount--) != 0) {
            vm.removeViewAt((ViewGroup) view, vm.getChildCount((ViewGroup) view) - 1);
        }
    }
}
