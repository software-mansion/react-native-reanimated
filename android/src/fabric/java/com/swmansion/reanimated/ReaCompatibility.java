package com.swmansion.reanimated;

import com.facebook.react.bridge.ReactApplicationContext;
import com.swmansion.reanimated.NodesManager;
import com.facebook.react.fabric.FabricUIManager;

class ReaCompatibility {
    private FabricUIManager fabricUIManager;

    public ReaCompatibility(ReactApplicationContext reactApplicationContext) {
        fabricUIManager = (FabricUIManager) UIManagerHelper.getUIManager(mReactApplicationContext, UIManagerType.FABRIC);
    }

    public void registerFabricEventListener(NodesManager nodeManager) {
        if (fabricUIManager != null) {
            fabricUIManager.getEventDispatcher().addListener(nodeManager);
        }
    }

    public void synchronouslyUpdateUIProps(int viewTag, ReadableMap uiProps) {
        fabricUIManager.synchronouslyUpdateViewOnUIThread(viewTag, uiProps);
    }
}