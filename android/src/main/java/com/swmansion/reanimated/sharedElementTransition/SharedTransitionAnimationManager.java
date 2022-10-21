package com.swmansion.reanimated.sharedElementTransition;

import android.view.View;
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
  private final Set<Integer> sharedElementsTags = new HashSet<>();
  private final Map<Integer, List<SharedTransitionConfig>> screenSharedElementsRegistry =
      new HashMap<>();
  private final Map<Integer, Boolean> screenTransitionStateRegistry = new HashMap<>();

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
    return sharedElementsTags.contains(viewTag);
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
          viewConfig.view = view;
        } catch (Exception e) {
          view = viewConfig.view;
          isInViewTree = false;
        }
        if (view.getParent() != null) {
          viewConfig.setParent((View) view.getParent());
        }
        if (isInSubtreeOf(view, currentScreen, viewConfig.parentScreen)) {
          fromView = view;
          viewConfig.parentScreen = currentScreen;
          if (view.getParent() != null) {
            fromViewParent = (View) view.getParent();
          } else {
            fromViewParent = viewConfig.getParent();
          }
          if (isInViewTree) {
            makeSnapshot(view);
          }
        } else if (isInSubtreeOf(view, targetScreen, viewConfig.parentScreen)) {
          toView = view;
          viewConfig.parentScreen = targetScreen;
        }
      }

      if (fromView != null && toView != null && fromViewParent != null) {
        sharedElements.add(new SharedTransitionConfig(fromView, toView, fromViewParent));
      }
    }

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

  private boolean isInSubtreeOf(View child, View root, View parentScreen) {
    if (root == null || child == null) {
      return false;
    }
    if (child.getParent() == null && parentScreen != null && root == parentScreen) {
      return true;
    }
    return (child.getParent() == root) || isInSubtreeOf((View) child.getParent(), root, null);
  }

  public void registerSharedTransitionTag(String sharedTransitionTag, int viewTag) {
    if (!sharedTransitionsItems.containsKey(sharedTransitionTag)) {
      sharedElementsIterationOrder.add(sharedTransitionTag);
      sharedTransitionsItems.put(sharedTransitionTag, new ArrayList<>());
    }
    List<SharedViewConfig> transitionItems = sharedTransitionsItems.get(sharedTransitionTag);
    assert transitionItems != null;
    transitionItems.add(new SharedViewConfig(viewTag));
    sharedElementsTags.add(viewTag);
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
