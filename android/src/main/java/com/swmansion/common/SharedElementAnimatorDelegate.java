package com.swmansion.common;

import android.view.View;

import com.swmansion.reanimated.sharedElementTransition.SharedViewConfig;

import java.util.List;
import java.util.Map;

/*
common part with react-native-screens for Shared Element Transition
 */

public interface SharedElementAnimatorDelegate {
  void runTransition(View before, View after);
  void onNativeAnimationEnd(View screen, List<View> toRemove);
  void makeSnapshot(View view);
  Map<String, List<SharedViewConfig>> getSharedTransitionItems();
  List<String> getSharedElementsIterationOrder();
  boolean isTagUnderTransition(int viewTag);
}
