package com.swmansion.reanimated.view;

import androidx.annotation.NonNull;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;

public class REASharedTransitionBoundaryManager
    extends ViewGroupManager<REASharedTransitionBoundaryView> {
  @NonNull
  @Override
  public String getName() {
    return "REASharedTransitionBoundary";
  }

  @NonNull
  @Override
  protected REASharedTransitionBoundaryView createViewInstance(
      @NonNull ThemedReactContext themedReactContext) {
    return new REASharedTransitionBoundaryView(themedReactContext);
  }
}
