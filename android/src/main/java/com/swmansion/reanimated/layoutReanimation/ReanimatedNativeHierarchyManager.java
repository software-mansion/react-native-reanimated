package com.swmansion.reanimated.layoutReanimation;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;

import androidx.annotation.Nullable;

import com.facebook.common.logging.FLog;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.RootViewManager;
import com.facebook.react.uimanager.ViewAtIndex;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.uimanager.ViewManagerRegistry;
import com.facebook.react.uimanager.layoutanimation.LayoutAnimationController;
import com.facebook.react.uimanager.layoutanimation.LayoutAnimationListener;
import com.swmansion.reanimated.ReanimatedModule;

import java.lang.ref.WeakReference;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

class ReaLayoutAnimator extends LayoutAnimationController {
    private AnimationsManager mAnimationsManager = null;
    private volatile boolean mInitialized = false;
    private ReactApplicationContext mContext = null;
    private WeakReference<NativeViewHierarchyManager> mWeakNativeViewHierarchyManage = new WeakReference<>(null);

    ReaLayoutAnimator(ReactApplicationContext context, NativeViewHierarchyManager nativeViewHierarchyManager) {
        mContext = context;
        mWeakNativeViewHierarchyManage = new WeakReference<>(nativeViewHierarchyManager);
    }

    public void maybeInit() {
        if (!mInitialized) {
            mInitialized = true;
            ReanimatedModule reanimatedModule = mContext.getNativeModule(ReanimatedModule.class);
            mAnimationsManager = reanimatedModule.getNodesManager().getReactBatchObserver().getAnimationsManager();
        }
    }

    public boolean shouldAnimateLayout(View viewToAnimate) {
        // if view parent is null, skip animation: view have been clipped, we don't want animation to
        // resume when view is re-attached to parent, which is the standard android animation behavior.
        // If there's a layout handling animation going on, it should be animated nonetheless since the
        // ongoing animation needs to be updated.
        if (viewToAnimate == null) {
            return false;
        }
        return (viewToAnimate.getParent() != null);
    }

    /**
     * Update layout of given view, via immediate update or animation depending on the current batch
     * layout animation configuration supplied during initialization. Handles create and update
     * animations.
     *
     * @param view the view to update layout of
     * @param x the new X position for the view
     * @param y the new Y position for the view
     * @param width the new width value for the view
     * @param height the new height value for the view
     */
    public void applyLayoutUpdate(View view, int x, int y, int width, int height) {
        UiThreadUtil.assertOnUiThread();
        maybeInit();

        final int reactTag = view.getId();

        // Determine which animation to use : if view is initially invisible, use create animation,
        // otherwise use update animation. This approach is easier than maintaining a list of tags
        // for recently created views.
        if (view.getWidth() == 0 || view.getHeight() == 0) {
            view.layout(x, y, x + width, y + height);
            mAnimationsManager.onViewCreate(view, (ViewGroup) view.getParent(), new Snapshot(view,mWeakNativeViewHierarchyManage.get()));
        } else {
            Snapshot before = new Snapshot(view,mWeakNativeViewHierarchyManage.get());
            view.layout(x, y, x + width, y + height);
            Snapshot after = new Snapshot(view,mWeakNativeViewHierarchyManage.get());
            mAnimationsManager.onViewUpdate(view, before, after);
        }
    }

    /**
     * Animate a view deletion using the layout animation configuration supplied during
     * initialization.
     *
     * @param view The view to animate.
     * @param listener Called once the animation is finished, should be used to completely remove the
     *     view.
     */
    public void deleteView(final View view, final LayoutAnimationListener listener) {
        UiThreadUtil.assertOnUiThread();
        maybeInit();
        Snapshot before = new Snapshot(view,mWeakNativeViewHierarchyManage.get());
        mAnimationsManager.onViewRemoval(view, (ViewGroup) view.getParent(), before, new Runnable() {
            @Override
            public void run() {
                listener.onAnimationEnd();
            }
        });
    }
}

public class ReanimatedNativeHierarchyManager extends NativeViewHierarchyManager {

    public ReanimatedNativeHierarchyManager(ViewManagerRegistry viewManagers, ReactApplicationContext reactContext) {
        super(viewManagers);
        Class clazz = super.getClass();
        try {
            Field field = clazz.getDeclaredField("mLayoutAnimator");
            field.setAccessible(true);
            field.setInt(field, field.getModifiers() & ~Modifier.FINAL);
            field.set(this, new ReaLayoutAnimator(reactContext, this));

        } catch (NoSuchFieldException | IllegalAccessException e) {
            //noop
        }
    }

    public ReanimatedNativeHierarchyManager(ViewManagerRegistry viewManagers, RootViewManager manager) {
        super(viewManagers, manager);
    }


}
