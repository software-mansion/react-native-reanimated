package com.swmansion.common;

import android.view.View;

import com.swmansion.reanimated.sharedElementTransition.SharedViewConfig;

import java.util.List;
import java.util.Map;

public interface SharedElementAnimatorDelegate {
  void runTransition(View before, View after);
  void onNativeAnimationEnd(View screen);
  void makeSnapshot(View view);
  Map<String, List<SharedViewConfig>> getSharedTransitionItems();
  List<String> getSharedElementsIterationOrder();
}
