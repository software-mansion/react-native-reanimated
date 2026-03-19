package com.swmansion.reanimated.view;

import android.content.Context;
import android.view.ViewGroup;

public class RNReanimatedSharedTransitionBoundaryView extends ViewGroup {
  public RNReanimatedSharedTransitionBoundaryView(Context context) {
    super(context);
    this.setClipChildren(false);
  }

  @Override
  protected void onLayout(boolean changed, int l, int t, int r, int b) {}
}
