package com.swmansion.reanimated.view;

import android.content.Context;
import android.view.ViewGroup;

public class REASharedTransitionBoundaryView extends ViewGroup {
  public REASharedTransitionBoundaryView(Context context) {
    super(context);
    // The boundary uses `display: contents`, so this view has an empty frame
    // while its children are laid out in the coordinate space of its parent.
    // Without this, the children would be clipped to the empty bounds.
    // It only affects children of this view, not the rest of the app.
    this.setClipChildren(false);
  }

  @Override
  protected void onLayout(boolean changed, int l, int t, int r, int b) {}
}
