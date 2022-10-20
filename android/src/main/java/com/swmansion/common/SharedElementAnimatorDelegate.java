package com.swmansion.common;

import android.content.Context;
import android.view.View;

import androidx.coordinatorlayout.widget.CoordinatorLayout;

import java.util.List;

/*
  Common part with react-native-screens for Shared Element Transition
*/

public interface SharedElementAnimatorDelegate {
  void runTransition(View before, View after);
  void onNativeAnimationEnd(View screen, List<View> toRemove);
  void makeSnapshot(View view);
  List<String> getSharedElementsIterationOrder();
  boolean isTagUnderTransition(int viewTag);
  List<SharedTransitionConfig> getSharedElementsForCurrentTransition(
    View currentScreen,
    View targetScreen
  );
  CoordinatorLayout getTransitionContainer(Context context);
  CoordinatorLayout getAnimationCoordinatorLayout(
    Context context,
    ScreenStackFragmentCommon mFragment
  );
}
