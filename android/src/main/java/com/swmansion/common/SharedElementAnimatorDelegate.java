package com.swmansion.common;

import android.content.Context;
import android.view.View;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import java.util.List;

/*
  Common part with react-native-screens for Shared Element Transition
*/

public interface SharedElementAnimatorDelegate {

  boolean shouldStartDefaultTransitionForView(View view);

  void onNativeAnimationEnd(View screen, List<View> toRemove);

  void onScreenTransitionCreate(View currentScreen, View targetScreen);

  CoordinatorLayout makeAnimationCoordinatorLayout(
      Context context, ScreenStackFragmentCommon mFragment);
}
