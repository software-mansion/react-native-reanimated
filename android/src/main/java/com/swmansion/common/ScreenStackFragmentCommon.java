package com.swmansion.common;

import android.app.Activity;
import android.view.View;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import java.util.List;

public interface ScreenStackFragmentCommon {
  CoordinatorLayout getFragmentTransitionContainer();

  List<SharedTransitionConfig> getFragmentSharedElements();

  Activity tryGetActivity();

  void onViewAnimationStart();

  void onViewAnimationEnd();

  void dispatchTransitionProgress(float interpolatedTime, boolean isResumed);

  boolean getIsActiveTransition();

  void setIsActiveTransition(boolean state);

  boolean getShouldPerformSET();

  void setShouldPerformSET(boolean state);

  View getFragmentScreen();
}
