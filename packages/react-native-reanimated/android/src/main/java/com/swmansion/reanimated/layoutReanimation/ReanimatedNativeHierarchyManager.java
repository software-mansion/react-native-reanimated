package com.swmansion.reanimated.layoutReanimation;

import android.os.Build;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.ViewAtIndex;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.uimanager.ViewManagerRegistry;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

public class ReanimatedNativeHierarchyManager extends ReanimatedNativeHierarchyManagerBase {
  private final HashMap<Integer, ArrayList<View>> toBeRemoved = new HashMap<>();
  private final HashMap<Integer, Runnable> cleanerCallback = new HashMap<>();
  private final ReaLayoutAnimator mReaLayoutAnimator;
  private final HashMap<Integer, Set<Integer>> mPendingDeletionsForTag = new HashMap<>();
  private boolean initOk = true;
  private final TabNavigatorObserver mTabNavigatorObserver;

  public ReanimatedNativeHierarchyManager(
      ViewManagerRegistry viewManagers, ReactApplicationContext reactContext) {
    super(viewManagers);

    mReaLayoutAnimator = new ReaLayoutAnimator(reactContext, this);
    mTabNavigatorObserver = new TabNavigatorObserver(mReaLayoutAnimator);

    Class<?> clazz = this.getClass().getSuperclass().getSuperclass();
    if (clazz == null) {
      Log.e(
          "reanimated",
          "unable to resolve NativeViewHierarchyManager class from ReanimatedNativeHierarchyManager");
      return;
    }

    try {
      Field layoutAnimatorField = clazz.getDeclaredField("mLayoutAnimator");
      layoutAnimatorField.setAccessible(true);

      if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        try {
          // accessFlags is supported only by API >=23
          Field modifiersField = Field.class.getDeclaredField("accessFlags");
          modifiersField.setAccessible(true);
          modifiersField.setInt(
              layoutAnimatorField, layoutAnimatorField.getModifiers() & ~Modifier.FINAL);
        } catch (NoSuchFieldException | IllegalAccessException e) {
          e.printStackTrace();
        }
      }
      layoutAnimatorField.set(this, mReaLayoutAnimator);
    } catch (NoSuchFieldException | IllegalAccessException e) {
      initOk = false;
      e.printStackTrace();
    }

    try {
      Field pendingTagsField = clazz.getDeclaredField("mPendingDeletionsForTag");
      pendingTagsField.setAccessible(true);

      if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        try {
          // accessFlags is supported only by API >=23
          Field pendingTagsFieldModifiers = Field.class.getDeclaredField("accessFlags");
          pendingTagsFieldModifiers.setAccessible(true);
          pendingTagsFieldModifiers.setInt(
              pendingTagsField, pendingTagsField.getModifiers() & ~Modifier.FINAL);
        } catch (NoSuchFieldException | IllegalAccessException e) {
          e.printStackTrace();
        }
      }
      pendingTagsField.set(this, mPendingDeletionsForTag);
    } catch (NoSuchFieldException | IllegalAccessException e) {
      initOk = false;
      e.printStackTrace();
    }

    if (initOk) {
      setLayoutAnimationEnabled(true);
    }
  }

  private boolean isLayoutAnimationDisabled() {
    return !initOk || !mReaLayoutAnimator.isLayoutAnimationEnabled();
  }

  @Override
  public synchronized void updateLayoutCommon(
      int parentTag, int tag, int x, int y, int width, int height) {
    if (isLayoutAnimationDisabled()) {
      return;
    }
    try {
      ViewManager viewManager = resolveViewManager(tag);
      String viewManagerName = viewManager.getName();
      View container = resolveView(parentTag);
      if (container != null && viewManagerName.equals("RNSScreen") && mReaLayoutAnimator != null) {
        boolean hasHeader = checkIfTopScreenHasHeader((ViewGroup) container);
        if (!hasHeader || !container.isLayoutRequested()) {
          mReaLayoutAnimator.getAnimationsManager().screenDidLayout(container);
        }
        View screen = resolveView(tag);
        View screenFragmentManager = (View) screen.getParent();
        if (screenFragmentManager != null) {
          View screenHolder = (View) screenFragmentManager.getParent();
          if (ScreensHelper.isScreenContainer(screenHolder)) {
            mTabNavigatorObserver.handleScreenContainerUpdate(screen);
          }
        }
      }
      View view = resolveView(tag);
      if (view != null && mReaLayoutAnimator != null) {
        mReaLayoutAnimator.getAnimationsManager().viewDidLayout(view);
      }
    } catch (IllegalViewOperationException e) {
      // (IllegalViewOperationException) == (vm == null)
      e.printStackTrace();
    }
  }

  private boolean checkIfTopScreenHasHeader(ViewGroup screenStack) {
    try {
      ViewGroup fragment = (ViewGroup) screenStack.getChildAt(0);
      ViewGroup screen = (ViewGroup) fragment.getChildAt(0);
      View headerConfig = screen.getChildAt(0);
      Field field = headerConfig.getClass().getDeclaredField("mIsHidden");
      field.setAccessible(true);
      return !field.getBoolean(headerConfig);
    } catch (NullPointerException | NoSuchFieldException | IllegalAccessException e) {
      return false;
    }
  }

  @Override
  public synchronized void manageChildren(
      int tag,
      @Nullable int[] indicesToRemove,
      @Nullable ViewAtIndex[] viewsToAdd,
      @Nullable int[] tagsToDelete) {
    if (isLayoutAnimationDisabled()) {
      super.manageChildren(tag, indicesToRemove, viewsToAdd, tagsToDelete);
      return;
    }
    ViewGroup viewGroup;
    ViewGroupManager viewGroupManager;
    try {
      viewGroup = (ViewGroup) resolveView(tag);
      viewGroupManager = (ViewGroupManager) resolveViewManager(tag);
    } catch (IllegalViewOperationException e) {
      // (IllegalViewOperationException) == (vm == null)
      e.printStackTrace();
      super.manageChildren(tag, indicesToRemove, viewsToAdd, tagsToDelete);
      return;
    }

    // we don't want layout animations in native-stack since it is currently buggy there
    AnimationsManager animationsManager = mReaLayoutAnimator.getAnimationsManager();
    if (viewGroupManager.getName().equals("RNSScreenStack")) {
      if (tagsToDelete == null) {
        animationsManager.makeSnapshotOfTopScreenViews(viewGroup);
      } else {
        animationsManager.notifyAboutViewsRemoval(tagsToDelete);
      }
      if (indicesToRemove != null && mReaLayoutAnimator instanceof ReaLayoutAnimator) {
        for (int index : indicesToRemove) {
          View child = viewGroupManager.getChildAt(viewGroup, index);
          mReaLayoutAnimator.getAnimationsManager().cancelAnimationsInSubviews(child);
        }
      }
      super.manageChildren(tag, indicesToRemove, viewsToAdd, tagsToDelete);
      return;
    }

    if (toBeRemoved.containsKey(tag)) {
      ArrayList<View> childrenToBeRemoved = toBeRemoved.get(tag);
      HashSet<Integer> tagsToRemove = new HashSet<>();
      for (View childToRemove : childrenToBeRemoved) {
        tagsToRemove.add(childToRemove.getId());
      }
      while (viewGroupManager.getChildCount(viewGroup) != 0) {
        View child =
            viewGroupManager.getChildAt(viewGroup, viewGroupManager.getChildCount(viewGroup) - 1);
        if (tagsToRemove.contains(child.getId())) {
          viewGroupManager.removeViewAt(viewGroup, viewGroupManager.getChildCount(viewGroup) - 1);
        } else {
          break;
        }
      }
    }
    if (tagsToDelete != null) {
      if (!toBeRemoved.containsKey(tag)) {
        toBeRemoved.put(tag, new ArrayList<>());
      }
      ArrayList<View> toBeRemovedChildren = toBeRemoved.get(tag);
      for (Integer childTag : tagsToDelete) {
        View view;
        try {
          view = resolveView(childTag);
        } catch (IllegalViewOperationException e) {
          // (IllegalViewOperationException) == (vm == null)
          e.printStackTrace();
          continue;
        }
        toBeRemovedChildren.add(view);
        // It's far from optimal but let's leave it as it is for now
        cleanerCallback.put(
            view.getId(),
            () -> {
              toBeRemovedChildren.remove(view);
              viewGroupManager.removeView(viewGroup, view);
            });
      }
    }

    // mPendingDeletionsForTag is modify by React
    if (mPendingDeletionsForTag != null) {
      Set<Integer> pendingTags = mPendingDeletionsForTag.get(tag);
      if (pendingTags != null) {
        pendingTags.clear();
      }
    }
    animationsManager.notifyAboutViewsRemoval(tagsToDelete);
    super.manageChildren(tag, indicesToRemove, viewsToAdd, null);
    if (toBeRemoved.containsKey(tag)) {
      ArrayList<View> childrenToBeRemoved = toBeRemoved.get(tag);
      for (View child : childrenToBeRemoved) {
        viewGroupManager.addView(viewGroup, child, viewGroupManager.getChildCount(viewGroup));
      }
    }
    super.manageChildren(tag, null, null, tagsToDelete);
  }

  public void publicDropView(View view) {
    dropView(view);
  }

  @Override
  protected synchronized void dropView(View view) {
    if (isLayoutAnimationDisabled()) {
      super.dropView(view);
      return;
    }
    if (toBeRemoved.containsKey(view.getId())) {
      toBeRemoved.remove(view.getId());
    }
    if (cleanerCallback.containsKey(view.getId())) {
      Runnable runnable = cleanerCallback.get(view.getId());
      cleanerCallback.remove(view.getId());
      runnable.run();
    }
    // childrens' callbacks should be cleaned by former publicDropView calls as Animation Manager
    // stripes views from bottom to top
    super.dropView(view);
  }
}
