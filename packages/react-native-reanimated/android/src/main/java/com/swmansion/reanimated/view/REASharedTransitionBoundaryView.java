package com.swmansion.reanimated.view;

import android.content.Context;
import android.view.ViewGroup;

public class REASharedTransitionBoundaryView extends ViewGroup {
  public REASharedTransitionBoundaryView(Context context) {
    super(context);
    // Children can lie outside the boundary's frame — moved by an animation
    // without a re-layout, or laid out at negative coordinates — so they
    // must not be clipped.
    this.setClipChildren(false);
  }

  @Override
  protected void onLayout(boolean changed, int l, int t, int r, int b) {}
}
