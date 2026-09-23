package com.swmansion.reanimated.view;

import android.content.Context;
import android.view.ViewGroup;
import com.facebook.react.uimanager.PointerEvents;
import com.facebook.react.uimanager.ReactPointerEventsView;

public class REASharedTransitionBoundaryView extends ViewGroup implements ReactPointerEventsView {
  public REASharedTransitionBoundaryView(Context context) {
    super(context);
    // Children can lie outside the boundary's frame — moved by an animation
    // without a re-layout, or laid out at negative coordinates — so they
    // must not be clipped.
    this.setClipChildren(false);
  }

  @Override
  public PointerEvents getPointerEvents() {
    return PointerEvents.BOX_NONE;
  }

  @Override
  protected void onLayout(boolean changed, int l, int t, int r, int b) {}
}
