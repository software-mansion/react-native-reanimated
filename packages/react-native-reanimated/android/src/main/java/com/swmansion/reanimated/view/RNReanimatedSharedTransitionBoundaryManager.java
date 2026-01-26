package com.swmansion.reanimated.view;

import androidx.annotation.NonNull;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;

public class RNReanimatedSharedTransitionBoundaryManager extends ViewGroupManager<RNReanimatedSharedTransitionBoundaryView> {
  @NonNull
  @Override
  public String getName() {
    return "RNReanimatedSharedTransitionBoundary";
  }

  @NonNull
  @Override
  protected RNReanimatedSharedTransitionBoundaryView createViewInstance(@NonNull ThemedReactContext themedReactContext) {
    return new RNReanimatedSharedTransitionBoundaryView(themedReactContext);
  }
}
