package com.swmansion.reanimated.layoutReanimation;

import android.app.Activity;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.views.view.ReactViewGroup;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;

public class SharedTransitionManager {
  private final AnimationsManager mAnimationsManager;
  private NativeMethodsHolder mNativeMethodsHolder;
  private final List<View> mAddedSharedViews = new ArrayList<>();
  private final Map<Integer, View> mSharedTransitionParent = new HashMap<>();
  private final Map<Integer, Integer> mSharedTransitionInParentIndex = new HashMap<>();
  private boolean mIsSharedTransitionActive;
  private final Map<Integer, Snapshot> mSnapshotRegistry = new HashMap<>();
  private final Map<Integer, View> mCurrentSharedTransitionViews = new HashMap<>();
  private View mTransitionContainer;
  private final List<View> mRemovedSharedViews = new ArrayList<>();

  public SharedTransitionManager(AnimationsManager animationsManager) {
    mAnimationsManager = animationsManager;
  }

  protected void notifyAboutNewView(View view) {
    mAddedSharedViews.add(view);
  }

  protected void notifyAboutRemovedView(View view) {
    mRemovedSharedViews.add(view);
  }

  @Nullable
  protected View getTransitioningView(int tag) {
    return mCurrentSharedTransitionViews.get(tag);
  }

  protected void viewsDidLayout() {
    startSharedTransitionForViews(mAddedSharedViews, true);
    mAddedSharedViews.clear();
  }

  protected void onViewsRemoval(int[] tagsToDelete) {
    if (tagsToDelete != null) {
      visitTreeForTags(tagsToDelete, new SnapshotTreeVisitor());
      if (mCurrentSharedTransitionViews.size() > 0) {
        for (View view : mCurrentSharedTransitionViews.values()) {
          for (int tagToDelete : tagsToDelete) {
            if (isViewChildParent(view, tagToDelete)) {
              Log.v("a", "a");
            }
          }
        }
      }

      startSharedTransitionForViews(mRemovedSharedViews, false);
      ConfigCleanerTreeVisitor configCleanerTreeVisitor = new ConfigCleanerTreeVisitor();
      for (View removedSharedView : mRemovedSharedViews) {
        visitTree(removedSharedView, configCleanerTreeVisitor);
      }
      mRemovedSharedViews.clear();

      visitTreeForTags(tagsToDelete, configCleanerTreeVisitor);
    }
  }

  private boolean isViewChildParent(View view, int screenTag) {
    View parent = mSharedTransitionParent.get(view.getId());
    while (parent != null) {
      if (parent.getId() == screenTag) {
        return true;
      }
      if (parent.getClass().getSimpleName().equals("Screen")) {
        return false;
      }
      parent = (View) parent.getParent();
    }
    return false;
  }

  protected void doSnapshotForTopScreenViews(ViewGroup stack) {
    int screensCount = stack.getChildCount();
    if (screensCount > 0) {
      View firstStackChild = stack.getChildAt(0);
      if (firstStackChild instanceof ViewGroup) {
        View screen = ((ViewGroup) firstStackChild).getChildAt(0);
        visitNativeTreeAndMakeSnapshot(screen);
      } else {
        Log.e("[Reanimated]", "Unable to recognize screen on stack.");
      }
    }
  }

  protected void setNativeMethods(NativeMethodsHolder nativeMethods) {
    mNativeMethodsHolder = nativeMethods;
  }

  private void startSharedTransitionForViews(List<View> sharedViews, boolean withNewElements) {
    if (sharedViews.isEmpty()) {
      return;
    }
    sortViewsByTags(sharedViews);
    List<SharedElement> sharedElements =
        getSharedElementsForCurrentTransition(sharedViews, withNewElements);
    if (sharedElements.isEmpty()) {
      return;
    }
    setupTransitionContainer();
    reparentSharedViewsForCurrentTransition(sharedElements);
    startSharedTransition(sharedElements);
  }

  private void sortViewsByTags(List<View> views) {
    /*
      All shared views during the transition have the same parent. It is problematic if parent
      view and their children are in the same transition. To keep the valid order in the z-axis,
      we need to sort views by tags. Parent tag is lower than children tags.
    */
    Collections.sort(views, (v1, v2) -> Integer.compare(v2.getId(), v1.getId()));
  }

  private List<SharedElement> getSharedElementsForCurrentTransition(
      List<View> sharedViews, boolean addedNewScreen) {
    boolean tmp;
    Set<Integer> viewTags = new HashSet<>();
    if (!addedNewScreen) {
      for (View view : sharedViews) {
        viewTags.add(view.getId());
      }
    }
    List<SharedElement> sharedElements = new ArrayList<>();
    ReanimatedNativeHierarchyManager reanimatedNativeHierarchyManager =
        mAnimationsManager.getReanimatedNativeHierarchyManager();
    for (View sharedView : sharedViews) {
      int targetViewTag =
          mNativeMethodsHolder.findPrecedingViewTagForTransition(sharedView.getId());
      boolean bothAreRemoved = !addedNewScreen && viewTags.contains(targetViewTag);
      if (targetViewTag < 0) {
        continue;
      }
      View viewSource, viewTarget;
      if (addedNewScreen) {
        viewSource = reanimatedNativeHierarchyManager.resolveView(targetViewTag);
        viewTarget = sharedView;
      } else {
        viewSource = sharedView;
        viewTarget = reanimatedNativeHierarchyManager.resolveView(targetViewTag);
      }
      if (bothAreRemoved) {
        // case for nested stack
        clearAllSharedConfigsForView(viewSource);
        clearAllSharedConfigsForView(viewTarget);
        continue;
      }

      if (mCurrentSharedTransitionViews.containsKey(viewSource.getId())
          || mCurrentSharedTransitionViews.containsKey(viewTarget.getId())) {
        tmp = true;
      }

      View viewSourceScreen = findScreen(viewSource);
      View viewTargetScreen = findScreen(viewTarget);
      if (viewSourceScreen == null || viewTargetScreen == null) {
        continue;
      }

      ViewGroup stack = (ViewGroup) findStack(viewSourceScreen);
      if (stack == null) {
        continue;
      }

      ViewGroupManager stackViewGroupManager =
          (ViewGroupManager) reanimatedNativeHierarchyManager.resolveViewManager(stack.getId());
      int screensCount = stackViewGroupManager.getChildCount(stack);

      if (screensCount < 2) {
        continue;
      }

      View topScreen = stackViewGroupManager.getChildAt(stack, screensCount - 1);
      View secondScreen = stackViewGroupManager.getChildAt(stack, screensCount - 2);
      boolean isValidConfiguration;
      if (addedNewScreen) {
        isValidConfiguration =
            secondScreen.getId() == viewSourceScreen.getId()
                && topScreen.getId() == viewTargetScreen.getId();
      } else {
        isValidConfiguration =
            topScreen.getId() == viewSourceScreen.getId()
                && secondScreen.getId() == viewTargetScreen.getId();
      }
      if (!isValidConfiguration) {
        continue;
      }

      if (addedNewScreen) {
        makeSnapshot(viewSource);
        makeSnapshot(viewTarget);
      }
      Snapshot sourceViewSnapshot = mSnapshotRegistry.get(viewSource.getId());
      Snapshot targetViewSnapshot = mSnapshotRegistry.get(viewTarget.getId());

      if (!mCurrentSharedTransitionViews.containsKey(viewSource.getId())) {
        mCurrentSharedTransitionViews.put(viewSource.getId(), viewSource);
      }
      if (!mCurrentSharedTransitionViews.containsKey(viewTarget.getId())) {
        mCurrentSharedTransitionViews.put(viewTarget.getId(), viewTarget);
      }
      SharedElement sharedElement =
          new SharedElement(viewSource, sourceViewSnapshot, viewTarget, targetViewSnapshot);
      sharedElements.add(sharedElement);
    }
    return sharedElements;
  }

  private void setupTransitionContainer() {
    if (!mIsSharedTransitionActive) {
      mIsSharedTransitionActive = true;
      ReactContext context = mAnimationsManager.getContext();
      Activity currentActivity = context.getCurrentActivity();
      if (currentActivity == null) {
        return;
      }
      ViewGroup rootView = (ViewGroup) currentActivity.getWindow().getDecorView().getRootView();
      if (mTransitionContainer == null) {
        mTransitionContainer = new ReactViewGroup(context);
      }
      rootView.addView(mTransitionContainer);
      mTransitionContainer.bringToFront();
    }
  }

  private void reparentSharedViewsForCurrentTransition(List<SharedElement> sharedElements) {
    for (SharedElement sharedElement : sharedElements) {
      View viewSource = sharedElement.sourceView;
      View viewTarget = sharedElement.targetView;

      if (!mSharedTransitionParent.containsKey(viewSource.getId())) {
        mSharedTransitionParent.put(viewSource.getId(), (View) viewSource.getParent());
        mSharedTransitionInParentIndex.put(
            viewSource.getId(), ((ViewGroup) viewSource.getParent()).indexOfChild(viewSource));
        ((ViewGroup) viewSource.getParent()).removeView(viewSource);
        ((ViewGroup) mTransitionContainer).addView(viewSource);
      }

      if (!mSharedTransitionParent.containsKey(viewTarget.getId())) {
        mSharedTransitionParent.put(viewTarget.getId(), (View) viewTarget.getParent());
        mSharedTransitionInParentIndex.put(
            viewTarget.getId(), ((ViewGroup) viewTarget.getParent()).indexOfChild(viewTarget));
        ((ViewGroup) viewTarget.getParent()).removeView(viewTarget);
        ((ViewGroup) mTransitionContainer).addView(viewTarget);
      }
    }
  }

  private void startSharedTransition(List<SharedElement> sharedElements) {
    for (SharedElement sharedElement : sharedElements) {
      startSharedAnimationForView(
          sharedElement.sourceView,
          sharedElement.sourceViewSnapshot,
          sharedElement.targetViewSnapshot);
      startSharedAnimationForView(
          sharedElement.targetView,
          sharedElement.sourceViewSnapshot,
          sharedElement.targetViewSnapshot);
    }
  }

  private void startSharedAnimationForView(View view, Snapshot before, Snapshot after) {
    HashMap<String, Object> targetValues = after.toTargetMap();
    HashMap<String, Object> startValues = before.toCurrentMap();

    HashMap<String, Float> preparedStartValues =
        mAnimationsManager.prepareDataForAnimationWorklet(startValues, false);
    HashMap<String, Float> preparedTargetValues =
        mAnimationsManager.prepareDataForAnimationWorklet(targetValues, true);
    HashMap<String, Float> preparedValues = new HashMap<>(preparedTargetValues);
    preparedValues.putAll(preparedStartValues);

    mNativeMethodsHolder.startAnimation(view.getId(), "sharedElementTransition", preparedValues);
  }

  protected void finishSharedAnimation(int tag) {
    View view = mCurrentSharedTransitionViews.get(tag);
    if (view != null) {
      ((ViewGroup) mTransitionContainer).removeView(view);
      View parentView = mSharedTransitionParent.get(view.getId());
      int childIndex = mSharedTransitionInParentIndex.get(view.getId());
      ViewGroup parentViewGroup = ((ViewGroup) parentView);
      if (childIndex <= parentViewGroup.getChildCount()) {
        parentViewGroup.addView(view, childIndex);
      } else {
        parentViewGroup.addView(view);
      }
      Snapshot viewSourcePreviousSnapshot = mSnapshotRegistry.get(view.getId());
      int originY = viewSourcePreviousSnapshot.originY;
      if (findStack(view) == null) {
        viewSourcePreviousSnapshot.originY = viewSourcePreviousSnapshot.topInsetFromParent;
      }
      Map<String, Object> snapshotMap = viewSourcePreviousSnapshot.toBasicMap();
      Map<String, Object> preparedValues = new HashMap<>();
      for (String key : snapshotMap.keySet()) {
        Object value = snapshotMap.get(key);
        preparedValues.put(key, (double) PixelUtil.toDIPFromPixel((int) value));
      }
      mAnimationsManager.progressLayoutAnimation(view.getId(), preparedValues, true);
      viewSourcePreviousSnapshot.originY = originY;
      mCurrentSharedTransitionViews.remove(view.getId());
    }
    if (mCurrentSharedTransitionViews.isEmpty()) {
      mSharedTransitionParent.clear();
      mSharedTransitionInParentIndex.clear();
      if (mTransitionContainer != null) {
        ViewParent transitionContainerParent = mTransitionContainer.getParent();
        if (transitionContainerParent != null) {
          ((ViewGroup) transitionContainerParent).removeView(mTransitionContainer);
        }
      }
      mIsSharedTransitionActive = false;
    }
  }

  @Nullable
  private View findScreen(View view) {
    ViewParent parent = view.getParent();
    while (parent != null) {
      if (parent.getClass().getSimpleName().equals("Screen")) {
        return (View) parent;
      }
      parent = parent.getParent();
    }
    return null;
  }

  @Nullable
  private View findStack(View view) {
    ViewParent parent = view.getParent();
    while (parent != null) {
      if (parent.getClass().getSimpleName().equals("ScreenStack")) {
        return (View) parent;
      }
      parent = parent.getParent();
    }
    return null;
  }

  protected void makeSnapshot(View view) {
    Snapshot snapshot = new Snapshot(view);
    View screen = findScreen(view);
    if (screen != null) {
      snapshot.originY -= screen.getTop();
    }
    mSnapshotRegistry.put(view.getId(), snapshot);
  }

  interface TreeVisitor {
    void run(View view);
  }

  class SnapshotTreeVisitor implements TreeVisitor {
    public void run(View view) {
      if (mAnimationsManager.hasAnimationForTag(view.getId(), "sharedElementTransition")) {
        mRemovedSharedViews.add(view);
        makeSnapshot(view);
      }
    }
  }

  class ConfigCleanerTreeVisitor implements TreeVisitor {
    public void run(View view) {
      mNativeMethodsHolder.clearAnimationConfig(view.getId());
    }
  }

  protected void visitTreeForTags(int[] viewTags, TreeVisitor treeVisitor) {
    if (viewTags == null) {
      return;
    }
    ReanimatedNativeHierarchyManager reanimatedNativeHierarchyManager =
        mAnimationsManager.getReanimatedNativeHierarchyManager();
    for (int viewTag : viewTags) {
      View view = reanimatedNativeHierarchyManager.resolveView(viewTag);
      visitTree(view, treeVisitor);
    }
  }

  private void visitTree(View view, TreeVisitor treeVisitor) {
    int tag = view.getId();
    if (tag == -1) {
      return;
    }
    boolean tagIsOK = tag == 639;
    if (tagIsOK) {
      Log.v("hmm", "eeeee");
    }
    ViewGroup viewGroup;
    ViewGroupManager<ViewGroup> viewGroupManager;
    ReanimatedNativeHierarchyManager reanimatedNativeHierarchyManager =
        mAnimationsManager.getReanimatedNativeHierarchyManager();
    try {
      treeVisitor.run(view);

      if (!(view instanceof ViewGroup)) {
        return;
      }
      viewGroup = (ViewGroup) view;
      viewGroupManager =
          (ViewGroupManager) reanimatedNativeHierarchyManager.resolveViewManager(tag);
    } catch (IllegalViewOperationException e) {
      return;
    }
    if (viewGroupManager == null) {
      return;
    }
    for (int i = 0; i < viewGroupManager.getChildCount(viewGroup); i++) {
      View child = viewGroupManager.getChildAt(viewGroup, i);
      visitTree(child, treeVisitor);
    }
  }

  void visitNativeTreeAndMakeSnapshot(View view) {
    if (!(view instanceof ViewGroup)) {
      return;
    }
    ViewGroup viewGroup = (ViewGroup) view;
    makeSnapshot(view);
    for (int i = 0; i < viewGroup.getChildCount(); i++) {
      View child = viewGroup.getChildAt(i);
      visitNativeTreeAndMakeSnapshot(child);
    }
  }

  private void clearAllSharedConfigsForView(View view) {
    int viewTag = view.getId();
    mSnapshotRegistry.remove(viewTag);
    mNativeMethodsHolder.clearAnimationConfig(viewTag);
  }

  private void cancelAnimation(View view) {
    int viewTag = view.getId();
    mNativeMethodsHolder.clearAnimationConfig(viewTag - 1000000);
  }
}
