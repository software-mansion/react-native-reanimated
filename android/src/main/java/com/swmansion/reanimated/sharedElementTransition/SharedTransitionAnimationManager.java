package com.swmansion.reanimated.sharedElementTransition;

import android.view.View;
import android.view.ViewGroup;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.common.UIManagerType;
import com.swmansion.reanimated.layoutReanimation.AnimationsManager;
import com.swmansion.reanimated.layoutReanimation.Snapshot;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class SharedTransitionAnimationManager {

  private final AnimationsManager animationsManager;
  private final Map<String, List<SharedViewConfig>> sharedTransitionsItems = new HashMap<>();
  private final List<String> sharedElementsIterationOrder = new ArrayList<>();
  private final Map<Integer, Snapshot> snapshotRegistry = new HashMap<>();
  private final Map<Integer, List<SharedTransitionConfig>> screenSharedElementsRegistry =
      new HashMap<>();
  private final Map<Integer, Boolean> screenTransitionStateRegistry = new HashMap<>();
  private final Set<Integer> viewTagsWithSharedTransition = new HashSet<>();
  private final Map<Integer, View> removedViewRegistry = new HashMap<>();
  private final Map<Integer, View> removedViewParentRegistry = new HashMap<>();

  SharedTransitionAnimationManager(AnimationsManager animationsManager) {
    this.animationsManager = animationsManager;
  }

  public boolean shouldStartDefaultTransitionForView(View view) {
    boolean isUnderTransition = isTagUnderTransition(view.getId());
    if (isUnderTransition) {
      makeSnapshot(view);
    }
    return !isUnderTransition;
  }

  public void onNativeAnimationEnd(View screen, List<View> toRemove) {
    for (View view : toRemove) {
      int viewTag = view.getId();
      animationsManager.stopAnimation(viewTag);
      Snapshot snapshot = snapshotRegistry.get(viewTag);
      if (snapshot != null) {
        animationsManager.updateProps(snapshot.toBasicMap(), viewTag);
      }
    }
    for (Map.Entry<String, List<SharedViewConfig>> tagGroupEntry :
        sharedTransitionsItems.entrySet()) {
      List<SharedViewConfig> tagGroup = tagGroupEntry.getValue();
      for (SharedViewConfig sharedViewConfig : tagGroup) {
        if (sharedViewConfig.toRemove) {
          tagGroup.remove(sharedViewConfig);
          viewTagsWithSharedTransition.remove(sharedViewConfig.viewTag);
        }
      }
      if (tagGroup.isEmpty()) {
        sharedTransitionsItems.remove(tagGroupEntry.getKey());
      }
    }
  }

  public void onScreenTransitionCreate(View currentScreen, View targetScreen) {
    screenSharedElementsRegistry.put(
        targetScreen.getId(), getSharedElementsForCurrentTransition(currentScreen, targetScreen));
    screenTransitionStateRegistry.put(targetScreen.getId(), false);
  }

  public void onScreenRemoving(View screen) {
    saveSharedTransitionItemsUnderTree(screen);
  }

  private void saveSharedTransitionItemsUnderTree(View view) {
    int viewTag = view.getId();
    if (viewTagsWithSharedTransition.contains(viewTag)) {
      removedViewRegistry.put(viewTag, view);
      removedViewParentRegistry.put(viewTag, (View) view.getParent());
    }
    if (view instanceof ViewGroup) {
      ViewGroup viewGroup = (ViewGroup)view;
      for (int i = 0; i < viewGroup.getChildCount(); i++) {
        View child = viewGroup.getChildAt(i);
        saveSharedTransitionItemsUnderTree(child);
      }
    }
  }

  public void runTransition(View before, View after) {
    animationsManager.onViewTransition(
        before, after, snapshotRegistry.get(before.getId()), snapshotRegistry.get(after.getId()));
  }

  public void makeSnapshot(View view) {
    snapshotRegistry.put(view.getId(), new Snapshot(view));
  }

  public List<String> getSharedElementsIterationOrder() {
    return sharedElementsIterationOrder;
  }

  public boolean isTagUnderTransition(int viewTag) {
    return viewTagsWithSharedTransition.contains(viewTag);
  }

  public List<SharedTransitionConfig> getSharedElementsForCurrentTransition(
      View currentScreen, View targetScreen) {
    List<SharedTransitionConfig> sharedElements = new ArrayList<>();
    UIManager uiManager =
        UIManagerHelper.getUIManager(
            (ReactContext) currentScreen.getContext(), UIManagerType.DEFAULT);
    if (uiManager == null) {
      return sharedElements;
    }
    int listSize = sharedElementsIterationOrder.size();
    for (int i = listSize - 1; i >= 0; i--) {
      String sharedTransitionTag = sharedElementsIterationOrder.get(i);
      List<SharedViewConfig> transitionGroup = sharedTransitionsItems.get(sharedTransitionTag);
      if (transitionGroup == null) {
        continue;
      }
      View fromView = null;
      View toView = null;
      View fromViewParent = null;
      for (SharedViewConfig viewConfig : transitionGroup) {
        boolean isInViewTree = true;
        View view;
        try {
          view = uiManager.resolveView(viewConfig.viewTag);
        } catch (Exception e) {
          view = removedViewRegistry.get(viewConfig.viewTag);
          isInViewTree = false;
        }
        if (view != null && view.getParent() != null) {
          viewConfig.parentTag = ((View) view.getParent()).getId();
        }
        if (isInSubtreeOf(view, currentScreen.getId(), viewConfig.parentScreenTag)) {
          fromView = view;
          viewConfig.parentScreenTag = currentScreen.getId();
          if (view.getParent() != null) {
            fromViewParent = (View) view.getParent();
          } else {
            fromViewParent = removedViewParentRegistry.get(view.getId());
          }
          if (isInViewTree) {
            makeSnapshot(view);
          }
        } else if (isInSubtreeOf(view, targetScreen.getId(), viewConfig.parentScreenTag)) {
          toView = view;
          viewConfig.parentScreenTag = targetScreen.getId();
        }
      }

      if (fromView != null && toView != null && fromViewParent != null) {
        sharedElements.add(new SharedTransitionConfig(fromView, toView, fromViewParent));
      }
    }

    removedViewRegistry.clear();
    removedViewParentRegistry.clear();

    return sharedElements;
  }

  public List<SharedTransitionConfig> getScreenSharedElementsRegistry(View screen) {
    return screenSharedElementsRegistry.get(screen.getId());
  }

  public void removeScreenSharedElementsRegistry(View screen) {
    screenSharedElementsRegistry.remove(screen.getId());
  }

  public boolean shouldPerformSharedElementTransition(View screen) {
    return screenSharedElementsRegistry.get(screen.getId()) != null;
  }

  public void setTransitionState(View screen, boolean state) {
    screenTransitionStateRegistry.put(screen.getId(), state);
  }

  public boolean getTransitionState(View screen) {
    return Boolean.TRUE.equals(screenTransitionStateRegistry.get(screen.getId()));
  }

  private boolean isInSubtreeOf(View child, int rootTag, int screenTag) {
    if (rootTag == -1 || child == null) {
      return false;
    }
    View parent = (View) child.getParent();
    if (parent == null && screenTag != -1 && rootTag == screenTag) {
      return true;
    }
    int parentTag = -1;
    if (parent != null) {
      parentTag = parent.getId();
    }
    return (parentTag == rootTag) || isInSubtreeOf((View) child.getParent(), rootTag, screenTag);
  }

  public void registerSharedTransitionTag(String sharedTransitionTag, int viewTag) {
    if (!sharedTransitionsItems.containsKey(sharedTransitionTag)) {
      sharedElementsIterationOrder.add(sharedTransitionTag);
      sharedTransitionsItems.put(sharedTransitionTag, new ArrayList<>());
    }
    List<SharedViewConfig> transitionItems = sharedTransitionsItems.get(sharedTransitionTag);
    assert transitionItems != null;
    transitionItems.add(new SharedViewConfig(viewTag));
    viewTagsWithSharedTransition.add(viewTag);
  }

  public void unregisterSharedTransitionTag(String sharedTransitionTag, int viewTag) {
    List<SharedViewConfig> transitionItems = sharedTransitionsItems.get(sharedTransitionTag);
    assert transitionItems != null;
    for (SharedViewConfig config : transitionItems) {
      if (config.viewTag == viewTag) {
        config.toRemove = true;
      }
    }
  }
}
