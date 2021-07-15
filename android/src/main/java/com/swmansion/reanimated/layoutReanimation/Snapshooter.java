package com.swmansion.reanimated.layoutReanimation;

import android.view.View;

import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.HashMap;

public class Snapshooter {
    public Integer tag;
    public ArrayList<View> listOfViews;
    public HashMap<Integer, HashMap<String, Object>> capturedValues = new HashMap<>();

    Snapshooter(Integer tag) {
        this.tag = tag;
        listOfViews = new ArrayList<>();
    }

    public static final String width = "width";
    public static final String height = "height";
    public static final String pathToTheRootView = "pathToTheRootView";
    public static final String originX = "originX";
    public static final String originY = "originY";
    public static final String globalOriginX = "globalOriginX";
    public static final String globalOriginY = "globalOriginY";
    public static final String parent = "parent";
    public static final String viewManager = "viewManager";
    public static final String parentViewManager = "parentViewManager";

    void takeSnapshot(View view, NativeViewHierarchyManager nativeViewHierarchyManager) {
        HashMap<String, Object> values = new HashMap<>();

        if (view instanceof AnimatedRoot) {
            ArrayList<View> pathToRootView = new ArrayList<>();
            View current = view;
            do {
                pathToRootView.add(current);
                current = (View)current.getParent();
            } while (current != view.getRootView());
            values.put(pathToTheRootView, pathToRootView);
        }

        values.put(width, view.getWidth());
        values.put(height, view.getHeight());
        values.put(originX, view.getLeft());
        values.put(originY, view.getTop());

        int[] location = new int[2];
        view.getLocationOnScreen(location);
        values.put(globalOriginX, location[0]);
        values.put(globalOriginY, location[1]);

        View parentView = (View)view.getParent();
        values.put(parent, (View)view.getParent());

        // TODO add viewManager
        ViewManager vm = null;
        ViewManager pvm = null;
        try {
            vm = nativeViewHierarchyManager.resolveViewManager(view.getId());
            pvm = nativeViewHierarchyManager.resolveViewManager(parentView.getId());
        } catch (IllegalViewOperationException e) {
            // do nothing
        }
        values.put(viewManager, vm);
        values.put(parentViewManager, pvm);

        listOfViews.add(view);
        capturedValues.put(view.getId(), values);
    }
}
