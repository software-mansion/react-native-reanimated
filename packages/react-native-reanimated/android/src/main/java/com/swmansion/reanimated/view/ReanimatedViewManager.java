package com.swmansion.reanimated.view;

import androidx.annotation.NonNull;

import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;

public class ReanimatedViewManager extends ViewGroupManager<ReanimatedView> {
  public ReanimatedViewManager() {}

  @NonNull
  @Override
  public String getName() {
    return "ReanimatedView";
  }

  @NonNull
  @Override
  protected ReanimatedView createViewInstance(@NonNull ThemedReactContext themedReactContext) {
    return new ReanimatedView(themedReactContext);
  }
}
