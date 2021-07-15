package com.swmansion.reanimated.layoutReanimation;

import android.os.Build;
import android.view.View;

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

// Use java BiFunction when minSdk is Bumped to 24
interface BiFunction<A, B> {
    void exec(A a, B b);
}

public class ReactBatchObserver {

    static HashSet<Integer> animatedRoots = new HashSet<Integer>();

    private ReactContext mContext;
    private UIManagerModule mUIManager;
    private UIImplementation mUIImplementation;
    private NodesManager mNodesManager;
    private HashSet<Integer> mAffectedAnimatedRoots = new HashSet<Integer>();
    private AnimationsManager mAnimationsManager;

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
        final HashSet<Integer> affectedTags = new HashSet<>(mAffectedAnimatedRoots);
        mAffectedAnimatedRoots = new HashSet<>();

        BiFunction<NativeViewHierarchyManager, BiFunction<AnimatedRoot, Integer>> goThroughAffectedWithLambda = (hierarchyManager, lambda) -> {
            for (Integer tag : affectedTags) {
                View view = null;
                try {
                    view = hierarchyManager.resolveView(tag);
                } catch (IllegalViewOperationException e) { }
                if (view == null || view.getParent() == null) {
                    lambda.exec(null, tag);
                    continue;
                }
                if (view instanceof AnimatedRoot) {
                    lambda.exec((AnimatedRoot)view, tag);
                }
            }
        };

        final HashMap<Integer, Snapshooter> firstSnapshots = new HashMap<>();

        //TODO use weakRefs here
        mUIManager.prependUIBlock(nativeViewHierarchyManager -> {
            BiFunction<AnimatedRoot, Integer> lambda = (AnimatedRoot root, Integer tag) -> {
                Snapshooter snapshooter = new Snapshooter(tag);
                if (root != null) {
                    ViewTraverser.traverse(root, (view) -> {
                        snapshooter.takeSnapshot(view, nativeViewHierarchyManager);
                    });
                }

                firstSnapshots.put(tag, snapshooter);
            };
            goThroughAffectedWithLambda.exec(nativeViewHierarchyManager, lambda);
        });

        //TODO use weakRefs inside the lambda
        mUIManager.addUIBlock(nativeViewHierarchyManager -> {
            BiFunction<AnimatedRoot, Integer> lambda = (AnimatedRoot root, Integer tag) -> {
                Snapshooter snapshooter = new Snapshooter(tag);
                if (root != null) {
                    ViewTraverser.traverse(root, (view) -> {
                        snapshooter.takeSnapshot(view, nativeViewHierarchyManager);
                    });
                }

                mAnimationsManager.notifyAboutSnapshots(firstSnapshots.get(tag), snapshooter);
            };
            goThroughAffectedWithLambda.exec(nativeViewHierarchyManager, lambda);
        });

    }

    public void willLayout() {
        mAffectedAnimatedRoots = new HashSet<>();
        HashSet<Integer> tags = new HashSet<>(ReactBatchObserver.animatedRoots);
        for (Integer tag : tags) {
            if (mUIImplementation.resolveShadowNode(tag) != null) {
                ReactShadowNode sn = mUIImplementation.resolveShadowNode(tag);
                if (sn.hasUpdates()) {
                    mAffectedAnimatedRoots.add(tag);
                }
            } else {
                mAffectedAnimatedRoots.add(tag);
                ReactBatchObserver.animatedRoots.remove(tag);
            }
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


