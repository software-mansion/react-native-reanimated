package com.swmansion.reanimated.layoutReanimation;

import android.view.View;
import android.view.ViewGroup;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.uimanager.layoutanimation.LayoutAnimationController;
import com.facebook.react.uimanager.layoutanimation.LayoutAnimationListener;
import com.swmansion.reanimated.ReanimatedModule;
import java.lang.ref.WeakReference;
import java.util.ArrayList;

class ReaLayoutAnimator extends LayoutAnimationController {
  private AnimationsManager mAnimationsManager = null;
  private volatile boolean mInitialized = false;
  private final ReactApplicationContext mContext;
  private final WeakReference<NativeViewHierarchyManager> mWeakNativeViewHierarchyManager;
  private final ArrayList<View> viewsToSnapshot = new ArrayList<>();

  ReaLayoutAnimator(
      ReactApplicationContext context, NativeViewHierarchyManager nativeViewHierarchyManager) {
    mContext = context;
    mWeakNativeViewHierarchyManager = new WeakReference<>(nativeViewHierarchyManager);
  }

  public void maybeInit() {
    if (!mInitialized) {
      mInitialized = true;
      ReanimatedModule reanimatedModule = mContext.getNativeModule(ReanimatedModule.class);
      mAnimationsManager = reanimatedModule.getNodesManager().getAnimationsManager();
      mAnimationsManager.setReanimatedNativeHierarchyManager(
          (ReanimatedNativeHierarchyManager) mWeakNativeViewHierarchyManager.get());
    }
  }

  public boolean shouldAnimateLayout(View viewToAnimate) {
    if (!isLayoutAnimationEnabled()) {
      return super.shouldAnimateLayout(viewToAnimate);
    }
    // if view parent is null, skip animation: view have been clipped, we don't want animation to
    // resume when view is re-attached to parent, which is the standard android animation behavior.
    // If there's a layout handling animation going on, it should be animated nonetheless since the
    // ongoing animation needs to be updated.
    if (viewToAnimate == null) {
      return false;
    }
    return (viewToAnimate.getParent() != null);
  }

  @Override
  public void reset() {
    super.reset();
    // we have to make snapshots of the views after all of them have updated layouts
    // to have correct global coordinates in the snapshots
    // we do it here because React calls reset() method after all views have updated layouts
    // and there is no semantically valid place to do it
    for (View view : viewsToSnapshot) {
      mAnimationsManager.onViewCreate(
          view,
          (ViewGroup) view.getParent(),
          new Snapshot(view, mWeakNativeViewHierarchyManager.get()));
    }
    viewsToSnapshot.clear();
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
    if (!isLayoutAnimationEnabled()) {
      super.applyLayoutUpdate(view, x, y, width, height);
      return;
    }
    UiThreadUtil.assertOnUiThread();
    maybeInit();
    // Determine which animation to use : if view is initially invisible, use create animation,
    // otherwise use update animation. This approach is easier than maintaining a list of tags
    // for recently created views.
    if (view.getWidth() == 0 || view.getHeight() == 0) {
      if (!mAnimationsManager.hasAnimationForTag(view.getId(), LayoutAnimations.Types.ENTERING)) {
        super.applyLayoutUpdate(view, x, y, width, height);
        mAnimationsManager.maybeRegisterSharedView(view);
        return;
      }
      view.layout(x, y, x + width, y + height);
      if (view.getId() != -1) {
        viewsToSnapshot.add(view);
      }
      return;
    }

    Snapshot before = new Snapshot(view, mWeakNativeViewHierarchyManager.get());
    view.layout(x, y, x + width, y + height);
    Snapshot after = new Snapshot(view, mWeakNativeViewHierarchyManager.get());
    mAnimationsManager.onViewUpdate(view, before, after);
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
    if (!isLayoutAnimationEnabled()) {
      super.deleteView(view, listener);
      return;
    }
    UiThreadUtil.assertOnUiThread();
    NativeViewHierarchyManager nativeViewHierarchyManager = mWeakNativeViewHierarchyManager.get();
    ViewManager viewManager;
    try {
      viewManager = nativeViewHierarchyManager.resolveViewManager(view.getId());
    } catch (IllegalViewOperationException e) {
      // (IllegalViewOperationException) == (vm == null)
      e.printStackTrace();
      mAnimationsManager.cancelAnimationsInSubviews(view);
      super.deleteView(view, listener);
      return;
    }
    // we don't want layout animations in native-stack since it is currently buggy there
    // so we check if it is a (grand)child of ScreenStack
    if (viewManager.getName().equals("RNSScreen")
        && view.getParent() != null
        && view.getParent().getParent() instanceof View) {
      // we check grandparent of Screen since the parent is a ScreenStackFragment
      View screenParentView = (View) view.getParent().getParent();
      ViewManager screenParentViewManager;
      try {
        screenParentViewManager =
            nativeViewHierarchyManager.resolveViewManager(screenParentView.getId());
      } catch (IllegalViewOperationException e) {
        // (IllegalViewOperationException) == (vm == null)
        e.printStackTrace();
        mAnimationsManager.cancelAnimationsInSubviews(view);
        super.deleteView(view, listener);
        return;
      }
      String parentName = screenParentViewManager.getName();
      if (parentName.equals("RNSScreenStack")) {
        mAnimationsManager.cancelAnimationsInSubviews(view);
        super.deleteView(view, listener);
        EventDispatcher eventDispatcher =
            UIManagerHelper.getEventDispatcherForReactTag(
                (ReactContext) view.getContext(), view.getId());
        if (eventDispatcher != null) {
          eventDispatcher.addListener(
              event -> {
                // we schedule the start of transition for the ScreenWilDisappear event, so that the
                // layout of the target screen is already calculated
                // this allows us to make snapshots on the go, so that they are always up-to-date
                if (event.getEventName().equals("topWillDisappear")) {
                  getAnimationsManager().notifyAboutScreenWillDisappear();
                }
              });
        }
        return;
      }
    }
    maybeInit();
    mAnimationsManager.onViewRemoval(view, (ViewGroup) view.getParent(), listener::onAnimationEnd);
  }

  public boolean isLayoutAnimationEnabled() {
    // In case the user rapidly reloads the app, there is a possibility that the active instance may
    // not be available.
    // However, the code will still attempt to trigger the layout animation of views that are going
    // to be dropped.
    // This is required as without it, the `mAnimationsManager.isLayoutAnimationEnabled`
    // would crash when trying to get the uiManager from the context.
    if (!mContext.hasActiveReactInstance()) {
      return false;
    }

    maybeInit();
    return mAnimationsManager.isLayoutAnimationEnabled();
  }

  public AnimationsManager getAnimationsManager() {
    return mAnimationsManager;
  }
}
