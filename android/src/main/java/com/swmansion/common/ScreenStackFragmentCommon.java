package com.swmansion.common;

import android.app.Activity;
import android.view.View;

/*
  Common part with react-native-screens for Shared Element Transition
*/

public interface ScreenStackFragmentCommon {
  Activity tryGetActivity();

  void onViewAnimationStart();

  void onViewAnimationEnd();

  void dispatchTransitionProgress(float interpolatedTime, boolean isResumed);

  View getFragmentScreen();
}
