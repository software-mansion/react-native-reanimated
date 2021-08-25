package com.swmansion.reanimated.layoutReanimation;

import android.view.View;
import android.view.ViewGroup;

import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.ViewManager;

import java.util.HashMap;

public class Snapshot {
    public static final String WIDTH = "width";
    public static final String HEIGHT = "height";
    public static final String ORIGIN_X = "originX";
    public static final String ORIGIN_Y = "originY";
    public static final String GLOBAL_ORIGIN_X = "globalOriginX";
    public static final String GLOBAL_ORIGIN_Y = "globalOriginY";
    public static final String PARENT = "parent";
    public static final String VIEW_MANAGER = "viewManager";
    public static final String PARENT_VIEW_MANAGER = "parentViewManager";
    public View view;
    public ViewGroup parent;
    public ViewManager viewManager;
    public ViewManager parentViewManager;
    public int width;
    public int height;
    public int originX;
    public int originY;
    public int globalOriginX;
    public int globalOriginY;

    Snapshot(View view, NativeViewHierarchyManager viewHierarchyManager) {
        parent = (ViewGroup) view.getParent();
        try {
            viewManager = viewHierarchyManager.resolveViewManager(view.getId());
            parentViewManager = viewHierarchyManager.resolveViewManager(parent.getId());
        } catch (IllegalViewOperationException | NullPointerException e) {
            // do nothing
        }
        width = view.getWidth();
        height = view.getHeight();
        originX = view.getLeft();
        originY = view.getTop();
        this.view = view;
        int[] location = new int[2];
        view.getLocationOnScreen(location);
        globalOriginX = location[0];
        globalOriginY = location[1];
    }

    public HashMap<String, Object> toMap() {
        HashMap<String, Object> data = new HashMap<>();
        data.put(Snapshot.ORIGIN_Y, originY);
        data.put(Snapshot.ORIGIN_X, originX);
        data.put(Snapshot.GLOBAL_ORIGIN_Y, globalOriginY);
        data.put(Snapshot.GLOBAL_ORIGIN_X, globalOriginX);
        data.put(Snapshot.PARENT, parent);
        data.put(Snapshot.PARENT_VIEW_MANAGER, parentViewManager);
        data.put(Snapshot.HEIGHT, height);
        data.put(Snapshot.WIDTH, width);
        data.put(Snapshot.VIEW_MANAGER, viewManager);
        return data;
    }
}
