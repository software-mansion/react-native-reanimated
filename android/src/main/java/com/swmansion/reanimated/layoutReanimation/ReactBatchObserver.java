package com.swmansion.reanimated.layoutReanimation;

import android.os.Build;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.LayoutShadowNode;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.ReactShadowNode;
import com.facebook.react.uimanager.ShadowNodeRegistry;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIImplementation;
import com.facebook.react.uimanager.UIManagerModule;
import com.swmansion.reanimated.NodesManager;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

public class ReactBatchObserver {

    private ReactContext mContext;
    private UIManagerModule mUIManager;
    private UIImplementation mUIImplementation;
    private NodesManager mNodesManager;
    private HashSet<Integer> mAffectedNodes = new HashSet<Integer>();
    private AnimationsManager mAnimationsManager;

    /* UI ONLY*/
    public HashMap<Integer, ViewGroup> parents = new HashMap();
    private NativeViewHierarchyManager mNativeViewHierarchyManager = null;

    public ReactBatchObserver(ReactContext context, UIManagerModule uiManager, UIImplementation uiImplementation, NodesManager nodesManager) {
        mContext = context;
        mUIImplementation = uiImplementation;
        mUIManager = uiManager;
        mNodesManager = nodesManager;
        mAnimationsManager = new AnimationsManager(mContext, mUIImplementation, mUIManager);

        // Register hooks similar to what we have on iOS willLayout and willMount

        mContext.runOnNativeModulesQueueThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Class clazz = mUIImplementation.getClass();
                    Field shadowRegistry = clazz.getDeclaredField("mShadowNodeRegistry");
                    shadowRegistry.setAccessible(true);
                    ShadowNodeRegistry shadowNodeRegistry = (ShadowNodeRegistry)shadowRegistry.get(mUIImplementation);
                    ReactShadowNode firstRootShadowNode = new FakeFirstRootShadowNode();
                    firstRootShadowNode.setMeasureSpecs(23,434);
                    ReactShadowNode lastRootShadowNode = new FakeLastRootShadowNode();
                    lastRootShadowNode.setMeasureSpecs(13, 34);
                    shadowNodeRegistry.addRootNode(firstRootShadowNode);
                    shadowNodeRegistry.addRootNode(lastRootShadowNode);
                } catch (NoSuchFieldException | IllegalAccessException e) {
                    e.printStackTrace();
                }
            }
        });
    }

    public void willMount() {

    }

    public void willLayout() {

    }

    public void onCatalystInstanceDestroy() {
        mContext = null;
        mUIManager = null;
        mUIImplementation.removeLayoutUpdateListener();
        mAnimationsManager.onCatalystInstanceDestroy();
        mAnimationsManager = null;
        mUIImplementation = null;
        mNodesManager = null;
        parents = null;
        mNativeViewHierarchyManager = null;
    }

    public AnimationsManager getAnimationsManager() {
        return mAnimationsManager;
    }

    class FakeFirstRootShadowNode extends LayoutShadowNode {
        FakeFirstRootShadowNode() {
            super();
            this.setReactTag(-5);
        }

        @Override
        public void calculateLayout(float width, float height) {
            willLayout();
        }
    }

    class FakeLastRootShadowNode extends LayoutShadowNode {
        FakeLastRootShadowNode() {
            super();
            this.setReactTag(50001); // % 10 == 1
        }

        @Override
        public void calculateLayout(float width, float height) {
            willMount();
        }
    }
}


