package com.swmansion.reanimated.layoutReanimation;

import android.app.Activity;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.uimanager.events.EventDispatcherListener;
import com.facebook.react.views.view.ReactViewGroup;
import com.swmansion.reanimated.Utils;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;
import javax.annotation.Nullable;

public class SharedTransitionManager {
  private final AnimationsManager mAnimationsManager;
  private NativeMethodsHolder mNativeMethodsHolder;
  private final List<View> mAddedSharedViews = new ArrayList<>();
  private final Map<Integer, View> mSharedTransitionParent = new HashMap<>();
  private final Map<Integer, Integer> mSharedTransitionInParentIndex = new HashMap<>();
  private final Map<Integer, Snapshot> mSnapshotRegistry = new HashMap<>();
  private final Map<Integer, View> mCurrentSharedTransitionViews = new HashMap<>();
  private final Map<Integer, SortedSet<Integer>> mSharedViewChildrenIndices = new HashMap<>();
  private View mTransitionContainer;
  private final List<View> mRemovedSharedViews = new ArrayList<>();
  private final Set<Integer> mViewTagsToHide = new HashSet<>();
  private final Map<Integer, Integer> mDisableCleaningForViewTag = new HashMap<>();
  private List<SharedElement> mSharedElements = new ArrayList<>();
  private final Map<Integer, SharedElement> mSharedElementsLookup = new HashMap<>();
  private final List<SharedElement> mSharedElementsWithProgress = new ArrayList<>();
  private final List<SharedElement> mSharedElementsWithAnimation = new ArrayList<>();
  private final Set<View> mReattachedViews = new HashSet<>();
  private boolean mIsTransitionPrepared = false;
  private final Set<Integer> mTagsToCleanup = new HashSet<>();

  class TopWillAppearListener implements EventDispatcherListener {
    private final EventDispatcher mEventDispatcher;

    public TopWillAppearListener(EventDispatcher eventDispatcher) {
      mEventDispatcher = eventDispatcher;
    }

    @Override
    public void onEventDispatch(Event event) {
      if (event.getEventName().equals("topWillAppear")) {
        tryStartSharedTransitionForViews(mAddedSharedViews, true);
        mAddedSharedViews.clear();
        mEventDispatcher.removeListener(this);
      }
    }
  }

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

  protected void screenDidLayout(View view) {
    if (mAddedSharedViews.isEmpty()) {
      return;
    }
    EventDispatcher eventDispatcher =
        UIManagerHelper.getEventDispatcherForReactTag(
            (ReactContext) view.getContext(), view.getId());
    if (eventDispatcher != null) {
      eventDispatcher.addListener(new TopWillAppearListener(eventDispatcher));
    }
  }

  protected void viewDidLayout(View view) {
    // this was causing problems when I moved the start of transition to the willAppear event
    // handler
    //    maybeRestartAnimationWithNewLayout(view);
  }

  protected void onViewsRemoval(int[] tagsToDelete) {
    if (tagsToDelete == null) {
      return;
    }
    visitTreeForTags(tagsToDelete, new SnapshotTreeVisitor());
    if (mRemovedSharedViews.size() > 0) {
      // this happens when navigation goes back
      mIsTransitionPrepared = prepareSharedTransition(mRemovedSharedViews, false);
      if (!mIsTransitionPrepared) {
        mRemovedSharedViews.clear();
      }
      visitTreeForTags(tagsToDelete, new PrepareConfigCleanupTreeVisitor());
    }
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

  private void maybeRestartAnimationWithNewLayout(View view) {
    View sharedView = mCurrentSharedTransitionViews.get(view.getId());
    if (sharedView == null) {
      return;
    }
    List<SharedElement> sharedElementsToRestart = new ArrayList<>();
    for (SharedElement sharedElement : mSharedElements) {
      if (sharedElement.targetView == sharedView) {
        sharedElementsToRestart.add(sharedElement);
        View sourceView = sharedElement.sourceView;
        View targetView = sharedElement.targetView;

        Snapshot newSourceViewSnapshot = new Snapshot(sourceView);
        Snapshot currentTargetViewSnapshot = mSnapshotRegistry.get(targetView.getId());
        Snapshot newTargetViewSnapshot = new Snapshot(targetView);

        int newOriginX =
            currentTargetViewSnapshot.originX
                - currentTargetViewSnapshot.originXByParent
                + newTargetViewSnapshot.originX;
        int newOriginY =
            currentTargetViewSnapshot.originY
                - currentTargetViewSnapshot.originYByParent
                + newTargetViewSnapshot.originY;

        currentTargetViewSnapshot.originX = newOriginX;
        currentTargetViewSnapshot.originY = newOriginY;
        currentTargetViewSnapshot.globalOriginX = newOriginX;
        currentTargetViewSnapshot.globalOriginY = newOriginY;
        currentTargetViewSnapshot.originXByParent = newTargetViewSnapshot.originXByParent;
        currentTargetViewSnapshot.originYByParent = newTargetViewSnapshot.originYByParent;
        currentTargetViewSnapshot.height = newTargetViewSnapshot.height;
        currentTargetViewSnapshot.width = newTargetViewSnapshot.width;
        sharedElement.sourceViewSnapshot = newSourceViewSnapshot;
        sharedElement.targetViewSnapshot = currentTargetViewSnapshot;

        disableCleaningForViewTag(sourceView.getId());
        disableCleaningForViewTag(targetView.getId());
      }
    }
    startSharedTransition(
        sharedElementsToRestart, LayoutAnimations.Types.SHARED_ELEMENT_TRANSITION);
  }

  protected boolean prepareSharedTransition(List<View> sharedViews, boolean withNewElements) {
    if (sharedViews.isEmpty()) {
      return false;
    }
    sortViewsByTags(sharedViews);
    List<SharedElement> sharedElements =
        getSharedElementsForCurrentTransition(sharedViews, withNewElements);
    if (sharedElements.isEmpty()) {
      return false;
    }
    setupTransitionContainer();
    reparentSharedViewsForCurrentTransition(sharedElements);
    orderByAnimationTypes(sharedElements);
    return true;
  }

  protected void onScreenWillDisappear() {
    for (Integer tag : mTagsToCleanup) {
      mNativeMethodsHolder.clearAnimationConfig(tag);
    }
    mTagsToCleanup.clear();

    if (!mIsTransitionPrepared) {
      return;
    }
    mIsTransitionPrepared = false;
    for (SharedElement sharedElement : mSharedElementsWithAnimation) {
      sharedElement.targetViewSnapshot = new Snapshot(sharedElement.targetView);
    }
    for (SharedElement sharedElement : mSharedElementsWithProgress) {
      sharedElement.targetViewSnapshot = new Snapshot(sharedElement.targetView);
    }

    startPreparedTransitions();
  }

  private boolean tryStartSharedTransitionForViews(
      List<View> sharedViews, boolean withNewElements) {
    if (!prepareSharedTransition(sharedViews, withNewElements)) {
      return false;
    }
    startPreparedTransitions();
    return true;
  }

  private void startPreparedTransitions() {
    startSharedTransition(
        mSharedElementsWithAnimation, LayoutAnimations.Types.SHARED_ELEMENT_TRANSITION);
    startSharedTransition(
        mSharedElementsWithProgress, LayoutAnimations.Types.SHARED_ELEMENT_TRANSITION_PROGRESS);
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
    // ignore removed views if it is transition restart
    boolean isTransitionRestart = mReattachedViews.size() > 0;
    List<View> newTransitionViews = new ArrayList<>();
    Set<Integer> viewTags = new HashSet<>();
    if (!addedNewScreen) {
      for (View view : sharedViews) {
        viewTags.add(view.getId());
      }
    }
    List<SharedElement> sharedElements = new ArrayList<>();
    ReanimatedNativeHierarchyManager reanimatedNativeHierarchyManager =
        mAnimationsManager.getReanimatedNativeHierarchyManager();
    Set<Integer> removedViewsTags = new HashSet<>();
    for (View view : mRemovedSharedViews) {
      removedViewsTags.add(view.getId());
    }
    for (View sharedView : sharedViews) {
      int targetViewTag =
          mNativeMethodsHolder.findPrecedingViewTagForTransition(sharedView.getId());
      if (isTransitionRestart) {
        while (removedViewsTags.contains(targetViewTag)) {
          mNativeMethodsHolder.clearAnimationConfig(targetViewTag);
          targetViewTag =
              mNativeMethodsHolder.findPrecedingViewTagForTransition(sharedView.getId());
        }
      }

      boolean bothAreRemoved = !addedNewScreen && viewTags.contains(targetViewTag);
      if (targetViewTag < 0) {
        continue;
      }

      View siblingView = reanimatedNativeHierarchyManager.resolveView(targetViewTag);
      siblingView = maybeOverrideSiblingForTabNavigator(sharedView, siblingView);

      View viewSource, viewTarget;
      if (addedNewScreen) {
        viewSource = siblingView;
        viewTarget = sharedView;
      } else {
        viewSource = sharedView;
        viewTarget = siblingView;
      }
      if (bothAreRemoved) {
        // case for nested stack
        clearAllSharedConfigsForView(viewSource);
        clearAllSharedConfigsForView(viewTarget);
        continue;
      }

      boolean isSourceViewInTransition =
          mCurrentSharedTransitionViews.containsKey(viewSource.getId());
      if (!isSourceViewInTransition) {
        View viewSourceScreen = findScreen(viewSource);
        View viewTargetScreen = findScreen(viewTarget);
        if (viewSourceScreen == null || viewTargetScreen == null) {
          continue;
        }

        ViewGroup sourceStack = (ViewGroup) findStack(viewSourceScreen);
        if (sourceStack == null) {
          continue;
        }
        int stackId = sourceStack.getId();
        ViewGroupManager stackViewManager =
            (ViewGroupManager) reanimatedNativeHierarchyManager.resolveViewManager(stackId);
        boolean isInSameStack = false;
        for (int i = 0; i < stackViewManager.getChildCount(sourceStack); i++) {
          if (stackViewManager.getChildAt(sourceStack, i) == viewTargetScreen) {
            isInSameStack = true;
          }
        }
        if (isInSameStack) {
          ViewGroupManager stackViewGroupManager =
              (ViewGroupManager)
                  reanimatedNativeHierarchyManager.resolveViewManager(sourceStack.getId());
          int screensCount = stackViewGroupManager.getChildCount(sourceStack);
          if (screensCount < 2) {
            continue;
          }

          View topScreen = stackViewGroupManager.getChildAt(sourceStack, screensCount - 1);
          View secondScreen = stackViewGroupManager.getChildAt(sourceStack, screensCount - 2);
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
        }
      }

      Snapshot sourceViewSnapshot = null;
      if (addedNewScreen) {
        mViewTagsToHide.add(viewSource.getId());
        if (isSourceViewInTransition) {
          sourceViewSnapshot = new Snapshot(viewSource);
        } else {
          makeSnapshot(viewSource);
        }
        makeSnapshot(viewTarget);
      } else if (isSourceViewInTransition) {
        makeSnapshot(viewSource);
      }
      if (sourceViewSnapshot == null) {
        sourceViewSnapshot = mSnapshotRegistry.get(viewSource.getId());
      }
      Snapshot targetViewSnapshot = mSnapshotRegistry.get(viewTarget.getId());
      if (targetViewSnapshot == null) {
        makeSnapshot(viewTarget);
      }

      newTransitionViews.add(viewSource);
      newTransitionViews.add(viewTarget);

      SharedElement sharedElement =
          new SharedElement(viewSource, sourceViewSnapshot, viewTarget, targetViewSnapshot);
      sharedElements.add(sharedElement);
    }

    if (!newTransitionViews.isEmpty()) {
      List<View> currentSourceViews = new ArrayList<>();
      for (SharedElement sharedElement : mSharedElements) {
        currentSourceViews.add(sharedElement.sourceView);
      }
      Set<View> newSourceViews = new HashSet<>();
      for (SharedElement sharedElement : sharedElements) {
        newSourceViews.add(sharedElement.sourceView);
      }
      for (View view : currentSourceViews) {
        if (!newSourceViews.contains(view)) {
          mViewTagsToHide.remove(view.getId());
          view.setVisibility(View.VISIBLE);
        }
      }
      mCurrentSharedTransitionViews.clear();
      for (View view : newTransitionViews) {
        mCurrentSharedTransitionViews.put(view.getId(), view);
      }
    }

    mSharedElements = sharedElements;
    for (SharedElement sharedElement : sharedElements) {
      mSharedElementsLookup.put(sharedElement.sourceView.getId(), sharedElement);
    }
    return sharedElements;
  }

  private View maybeOverrideSiblingForTabNavigator(View sharedView, View siblingView) {
    View maybeTabNavigatorForSharedView = ScreensHelper.getTabNavigator(sharedView);

    if (maybeTabNavigatorForSharedView == null) {
      return siblingView;
    }

    int siblingTag = siblingView.getId();
    int[] sharedGroup = mNativeMethodsHolder.getSharedGroup(sharedView.getId());
    int siblingIndex = -1;
    for (int i = 0; i < sharedGroup.length; i++) {
      if (sharedGroup[i] == siblingTag) {
        siblingIndex = i;
      }
    }

    for (int i = siblingIndex; i >= 0; i--) {
      int viewTag = sharedGroup[i];
      View view = mAnimationsManager.resolveView(viewTag);
      if (maybeTabNavigatorForSharedView == ScreensHelper.getTabNavigator(view)) {
        return view;
      }
    }

    return siblingView;
  }

  private void setupTransitionContainer() {
    if (mTransitionContainer == null) {
      ReactContext context = mAnimationsManager.getContext();
      mTransitionContainer = new ReactViewGroup(context);
    }
    if (mTransitionContainer.getParent() == null) {
      ReactContext context = mAnimationsManager.getContext();
      Activity currentActivity = context.getCurrentActivity();
      if (currentActivity == null) {
        return;
      }
      ViewGroup rootView = (ViewGroup) currentActivity.getWindow().getDecorView().getRootView();
      rootView.addView(mTransitionContainer);
      mTransitionContainer.bringToFront();
    }
  }

  private void reparentSharedViewsForCurrentTransition(List<SharedElement> sharedElements) {
    for (SharedElement sharedElement : sharedElements) {
      View viewSource = sharedElement.sourceView;
      if (!mSharedTransitionParent.containsKey(viewSource.getId())) {
        ViewGroup parent = (ViewGroup) viewSource.getParent();
        int parentTag = parent.getId();
        int childIndex = parent.indexOfChild(viewSource);
        mSharedTransitionParent.put(viewSource.getId(), (View) viewSource.getParent());
        mSharedTransitionInParentIndex.put(viewSource.getId(), childIndex);
        SortedSet<Integer> childrenIndicesSet = mSharedViewChildrenIndices.get(parentTag);
        if (childrenIndicesSet == null) {
          mSharedViewChildrenIndices.put(
              parentTag, new TreeSet<>(Collections.singleton(childIndex)));
        } else {
          childrenIndicesSet.add(childIndex);
        }
      }
    }

    for (SharedElement sharedElement : sharedElements) {
      View viewSource = sharedElement.sourceView;
      ((ViewGroup) viewSource.getParent()).removeView(viewSource);
      ((ViewGroup) mTransitionContainer).addView(viewSource);
      mReattachedViews.add(viewSource);
    }
  }

  private void startSharedTransition(List<SharedElement> sharedElements, int type) {
    for (SharedElement sharedElement : sharedElements) {
      View sourceView = sharedElement.sourceView;
      sourceView.setVisibility(View.VISIBLE);
      startSharedAnimationForView(
          sourceView, sharedElement.sourceViewSnapshot, sharedElement.targetViewSnapshot, type);
      sharedElement.targetView.setVisibility(View.INVISIBLE);
    }
  }

  private void startSharedAnimationForView(View view, Snapshot before, Snapshot after, int type) {
    HashMap<String, Object> targetValues = after.toTargetMap();
    HashMap<String, Object> startValues = before.toCurrentMap();

    HashMap<String, Object> preparedStartValues =
        mAnimationsManager.prepareDataForAnimationWorklet(startValues, false, true);
    HashMap<String, Object> preparedTargetValues =
        mAnimationsManager.prepareDataForAnimationWorklet(targetValues, true, true);
    HashMap<String, Object> preparedValues = new HashMap<>(preparedTargetValues);
    preparedValues.putAll(preparedStartValues);

    mNativeMethodsHolder.startAnimation(view.getId(), type, preparedValues);
  }

  protected void finishSharedAnimation(int tag) {
    if (mDisableCleaningForViewTag.containsKey(tag)) {
      enableCleaningForViewTag(tag);
      return;
    }
    SharedElement sharedElement = mSharedElementsLookup.get(tag);
    if (sharedElement == null) {
      return;
    }
    mSharedElementsLookup.remove(tag);
    View view = sharedElement.sourceView;

    if (mReattachedViews.contains(view)) {
      mReattachedViews.remove(view);

      int viewTag = view.getId();
      ((ViewGroup) mTransitionContainer).removeView(view);
      View parentView = mSharedTransitionParent.get(viewTag);
      int childIndex = mSharedTransitionInParentIndex.get(viewTag);
      ViewGroup parentViewGroup = ((ViewGroup) parentView);
      int parentTag = parentViewGroup.getId();
      SortedSet<Integer> childIndicesSet = mSharedViewChildrenIndices.get(parentTag);
      // here we calculate how many children with smaller indices have not been reinserted yet
      int childIndexOffset = childIndicesSet.headSet(childIndex).size();
      childIndicesSet.remove(childIndex);
      if (childIndicesSet.isEmpty()) {
        mSharedViewChildrenIndices.remove(parentTag);
      }
      childIndex -= childIndexOffset;
      if (childIndex <= parentViewGroup.getChildCount()) {
        parentViewGroup.addView(view, childIndex);
      } else {
        parentViewGroup.addView(view);
      }
      Snapshot viewSourcePreviousSnapshot = mSnapshotRegistry.get(viewTag);
      if (viewSourcePreviousSnapshot != null) {
        int originX = viewSourcePreviousSnapshot.originX;
        int originY = viewSourcePreviousSnapshot.originY;
        if (findStack(view) == null) {
          viewSourcePreviousSnapshot.originX = viewSourcePreviousSnapshot.originXByParent;
          viewSourcePreviousSnapshot.originY = viewSourcePreviousSnapshot.originYByParent;
        }
        Map<String, Object> snapshotMap = viewSourcePreviousSnapshot.toBasicMap();
        Map<String, Object> preparedValues = new HashMap<>();
        for (String key : snapshotMap.keySet()) {
          Object value = snapshotMap.get(key);
          if (key.equals(Snapshot.TRANSFORM_MATRIX)) {
            preparedValues.put(key, value);
          } else {
            float pixelsValue = Utils.convertToFloat(value);
            double dipValue = PixelUtil.toDIPFromPixel(pixelsValue);
            preparedValues.put(key, dipValue);
          }
        }
        mAnimationsManager.progressLayoutAnimation(viewTag, preparedValues, true);
        viewSourcePreviousSnapshot.originX = originX;
        viewSourcePreviousSnapshot.originY = originY;
      }
      if (mViewTagsToHide.contains(tag)) {
        view.setVisibility(View.INVISIBLE);
      }

      View targetView = sharedElement.targetView;
      int targetViewTag = targetView.getId();
      mCurrentSharedTransitionViews.remove(targetViewTag);
      mCurrentSharedTransitionViews.remove(viewTag);
      mSharedTransitionParent.remove(viewTag);
      mSharedTransitionInParentIndex.remove(viewTag);
    }
    sharedElement.targetView.setVisibility(View.VISIBLE);
    if (mRemovedSharedViews.contains(view)) {
      mRemovedSharedViews.remove(view);
      mSnapshotRegistry.remove(view.getId());
      mNativeMethodsHolder.clearAnimationConfig(view.getId());
    }
    if (mReattachedViews.isEmpty()) {
      if (mTransitionContainer != null) {
        ViewParent transitionContainerParent = mTransitionContainer.getParent();
        if (transitionContainerParent != null) {
          // To prevent modifications of the views tree while Android is iterating
          // over them, we can schedule the modification for the next frame. This
          // approach is safe. The transparent transition container will remain on
          // the screen for one additional frame before being removed.
          mTransitionContainer.post(
              () -> {
                if (mReattachedViews.size() > 0) {
                  return;
                }
                ((ViewGroup) transitionContainerParent).removeView(mTransitionContainer);
              });
        }
      }
      mSharedElements.clear();
      mSharedElementsWithProgress.clear();
      mSharedElementsWithAnimation.clear();
      mViewTagsToHide.clear();
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
    mSnapshotRegistry.put(view.getId(), snapshot);
  }

  interface TreeVisitor {
    void run(View view);
  }

  class SnapshotTreeVisitor implements TreeVisitor {
    public void run(View view) {
      if (mAnimationsManager.hasAnimationForTag(
          view.getId(), LayoutAnimations.Types.SHARED_ELEMENT_TRANSITION)) {
        mRemovedSharedViews.add(view);
        makeSnapshot(view);
      }
    }
  }

  class PrepareConfigCleanupTreeVisitor implements TreeVisitor {
    public void run(View view) {
      mTagsToCleanup.add(view.getId());
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
    ViewGroup viewGroup;
    ViewGroupManager<ViewGroup> viewGroupManager = null;
    ReanimatedNativeHierarchyManager reanimatedNativeHierarchyManager =
        mAnimationsManager.getReanimatedNativeHierarchyManager();
    try {
      treeVisitor.run(view);

      if (!(view instanceof ViewGroup)) {
        return;
      }
      viewGroup = (ViewGroup) view;
      ViewManager viewManager = reanimatedNativeHierarchyManager.resolveViewManager(tag);
      if (viewManager instanceof ViewGroupManager) {
        viewGroupManager = (ViewGroupManager<ViewGroup>) viewManager;
      }
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
    view = ScreensHelper.getTopScreenForStack(view);
    if (!(view instanceof ViewGroup)) {
      return;
    }
    ViewGroup viewGroup = (ViewGroup) view;
    if (mAnimationsManager.hasAnimationForTag(
        view.getId(), LayoutAnimations.Types.SHARED_ELEMENT_TRANSITION)) {
      makeSnapshot(view);
    }
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

  private void disableCleaningForViewTag(int viewTag) {
    Integer counter = mDisableCleaningForViewTag.get(viewTag);
    if (counter != null) {
      mDisableCleaningForViewTag.put(viewTag, counter + 1);
    } else {
      mDisableCleaningForViewTag.put(viewTag, 1);
    }
  }

  private void enableCleaningForViewTag(int viewTag) {
    Integer counter = mDisableCleaningForViewTag.get(viewTag);
    if (counter == null) {
      return;
    }
    if (counter == 1) {
      mDisableCleaningForViewTag.remove(viewTag);
    } else {
      mDisableCleaningForViewTag.put(viewTag, counter - 1);
    }
  }

  void orderByAnimationTypes(List<SharedElement> sharedElements) {
    mSharedElementsWithProgress.clear();
    mSharedElementsWithAnimation.clear();
    for (SharedElement sharedElement : sharedElements) {
      int viewTag = sharedElement.sourceView.getId();
      boolean viewHasProgressAnimation =
          mAnimationsManager.hasAnimationForTag(
              viewTag, LayoutAnimations.Types.SHARED_ELEMENT_TRANSITION_PROGRESS);
      if (viewHasProgressAnimation) {
        mSharedElementsWithProgress.add(sharedElement);
      } else {
        mSharedElementsWithAnimation.add(sharedElement);
      }
    }
  }

  public void navigationTabChanged(View previousTab, View newTab) {
    mAddedSharedViews.clear();
    List<SharedElement> sharedElements = new ArrayList<>();
    List<View> sharedViews = new ArrayList<>();
    findSharedViewsForScreen(previousTab, sharedViews);
    sortViewsByTags(sharedViews);
    for (View sharedView : sharedViews) {
      int[] sharedGroup = mNativeMethodsHolder.getSharedGroup(sharedView.getId());
      for (int i = sharedGroup.length - 1; i >= 0; i--) {
        View targetView = mAnimationsManager.resolveView(sharedGroup[i]);
        if (!ScreensHelper.isViewChildOfScreen(targetView, newTab)) {
          continue;
        }
        Snapshot sourceViewSnapshot = mSnapshotRegistry.get(sharedView.getId());
        if (sourceViewSnapshot == null) {
          // This is just to ensure that we have a snapshot and to prevent
          // a theoretically possible NullPointerException.
          continue;
        }
        SharedElement sharedElement =
            new SharedElement(sharedView, sourceViewSnapshot, targetView, new Snapshot(targetView));
        sharedElements.add(sharedElement);
        break;
      }
    }
    if (sharedElements.isEmpty()) {
      return;
    }
    mSharedElements = sharedElements;
    mSharedElementsWithAnimation.clear();
    for (SharedElement sharedElement : sharedElements) {
      mSharedElementsLookup.put(sharedElement.sourceView.getId(), sharedElement);
      mSharedElementsWithAnimation.add(sharedElement);
    }
    setupTransitionContainer();
    reparentSharedViewsForCurrentTransition(sharedElements);
    startSharedTransition(
        mSharedElementsWithAnimation, LayoutAnimations.Types.SHARED_ELEMENT_TRANSITION);
  }

  private void findSharedViewsForScreen(View view, List<View> sharedViews) {
    view = ScreensHelper.getTopScreenForStack(view);
    if (!(view instanceof ViewGroup)) {
      return;
    }
    ViewGroup viewGroup = (ViewGroup) view;
    if (mAnimationsManager.hasAnimationForTag(
        view.getId(), LayoutAnimations.Types.SHARED_ELEMENT_TRANSITION)) {
      sharedViews.add(view);
    }
    for (int i = 0; i < viewGroup.getChildCount(); i++) {
      View child = viewGroup.getChildAt(i);
      findSharedViewsForScreen(child, sharedViews);
    }
  }
}
