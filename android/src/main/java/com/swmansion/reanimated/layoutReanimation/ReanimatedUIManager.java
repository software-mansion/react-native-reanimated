package com.swmansion.reanimated.layoutReanimation;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.ViewManager;

import java.util.List;

public class ReanimatedUIManager extends UIManagerModule {
    public ReanimatedUIManager(ReactApplicationContext reactContext, ViewManagerResolver viewManagerResolver, int minTimeLeftInFrameForNonBatchedOperationMs) {
        super(reactContext, viewManagerResolver, minTimeLeftInFrameForNonBatchedOperationMs);
    }

    public ReanimatedUIManager(ReactApplicationContext reactContext, List<ViewManager> viewManagersList, int minTimeLeftInFrameForNonBatchedOperationMs) {
        super(reactContext, viewManagersList, minTimeLeftInFrameForNonBatchedOperationMs);
    }

    @Override
    public boolean canOverrideExistingModule() {
        return true;
    }

    @Override
    public void manageChildren(int viewTag, @Nullable ReadableArray moveFrom, @Nullable ReadableArray moveTo, @Nullable ReadableArray addChildTags, @Nullable ReadableArray addAtIndices, @Nullable ReadableArray removeFrom) {
        int x = 5;
        super.manageChildren(viewTag, moveFrom, moveTo, addChildTags, addAtIndices, removeFrom);
    }
}
