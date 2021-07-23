package com.swmansion.reanimated.layoutReanimation;

import android.os.Build;
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
    public HashSet<Integer> alreadySeen = new HashSet<>();
    public HashMap<Integer, ViewGroup> parents = new HashMap();
    public HashMap<Integer, Snapshot> snapshotsOfRemoved = new HashMap();
    public boolean deactivate = true;
    public boolean forceRemove = true;
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
        final HashSet<Integer> affectedTags = new HashSet<>(mAffectedNodes);
        mAffectedNodes = new HashSet<>();
        snapshotsOfRemoved.clear();

        final HashMap<Integer, Snapshot> firstSnapshots = new HashMap<>();

        //TODO use weakRefs here
        mUIManager.prependUIBlock(nativeViewHierarchyManager -> {
            if (mNativeViewHierarchyManager == null) {
                mNativeViewHierarchyManager = nativeViewHierarchyManager;
            }
            deactivate = false;
            forceRemove = false;
            for (int tag : affectedTags) {
                View view = null;
                try {
                    view = nativeViewHierarchyManager.resolveView(tag);
                } catch (IllegalViewOperationException e) {
                    //noop
                }
                if (view == null && alreadySeen.contains(tag)) { // removed not new
                   continue;
                }
                if (view == null && !alreadySeen.contains(tag)) { // it is a new view
                    continue; //(we cannot take a snapshot or add a listener lets wait for closing UI Block it won't be a null there)
                }
                firstSnapshots.put(tag, new Snapshot(view, nativeViewHierarchyManager));
            }
        });

        //TODO use weakRefs inside the lambda
        mUIManager.addUIBlock(nativeViewHierarchyManager -> {
            for (int tag : affectedTags) {
                View view = null;
                try {
                    view = nativeViewHierarchyManager.resolveView(tag);
                } catch (IllegalViewOperationException e) {
                    //noop
                }
                if (view == null && alreadySeen.contains(tag)) { // removed not new
                    continue;
                }
                if (view == null && !alreadySeen.contains(tag)) { // it is a new view
                    continue;

                }
                if (!alreadySeen.contains(tag) && view.isAttachedToWindow()) {
                    addViewListener(view);
                    continue;
                }
                Snapshot snapshot = firstSnapshots.get(tag);
                if (snapshot != null) {
                    mAnimationsManager.onViewUpdate(view, snapshot, new Snapshot(view, nativeViewHierarchyManager));
                }
            }
            forceRemove = true;
            deactivate = true;
            for (Map.Entry<Integer, Snapshot> entry : snapshotsOfRemoved.entrySet()) {
                mAnimationsManager.onViewRemoval(entry.getValue().view, entry.getValue().parent, entry.getValue());
            }
        });

    }

    private void addViewListener(View view) {
        alreadySeen.add(view.getId());
        parents.put(view.getId(), (ViewGroup) view.getParent());
        mAnimationsManager.onViewCreate(view, (ViewGroup) view.getParent(), new Snapshot(view, mNativeViewHierarchyManager));
        view.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            @Override
            public void onViewAttachedToWindow(View view) {
                if (deactivate) return;
                if (snapshotsOfRemoved.containsKey(view.getId())) {
                    snapshotsOfRemoved.remove(view.getId());
                }
            }

            @Override
            public void onViewDetachedFromWindow(View view) {
                if (forceRemove) {
                    parents.remove(view.getId());
                    alreadySeen.remove(view.getId());
                    view.removeOnAttachStateChangeListener(this);
                }
                if (deactivate) return;
                ViewGroup parent = parents.get(view.getId());
                deactivate = true;
                boolean attachedForSnapshot = false;
                if (view.getParent() == null) {
                    parent.addView(view);
                    attachedForSnapshot = true;
                }
                snapshotsOfRemoved.put(view.getId(), new Snapshot(view, mNativeViewHierarchyManager));
                if (attachedForSnapshot) {
                    parent.removeView(view);
                }
                deactivate = false;
            }
        });
    }

    public void willLayout() {
      ReactShadowNode rootShadowNode = mUIImplementation.resolveShadowNode(1);
      findAffected(rootShadowNode);
    }

    public void findAffected(ReactShadowNode rsn) {
        if (!rsn.isDirty() && (rsn.getParent() != null && !(rsn.getParent().isDirty()))) {
            return;
        }
        mAffectedNodes.add(rsn.getReactTag());
        for (int i = 0; i < rsn.getChildCount(); ++i) {
            findAffected(rsn.getChildAt(i));
        }
    }

    public void onCatalystInstanceDestroy() {
        mContext = null;
        mUIManager = null;
        mUIImplementation.removeLayoutUpdateListener();
        mAnimationsManager.onCatalystInstanceDestroy();
        mAnimationsManager = null;
        mUIImplementation = null;
        mNodesManager = null;
        alreadySeen = null;
        snapshotsOfRemoved = null;
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
            this.setReactTag(51); // % 10 == 1
        }

        @Override
        public void calculateLayout(float width, float height) {
            willMount();
        }
    }

}


