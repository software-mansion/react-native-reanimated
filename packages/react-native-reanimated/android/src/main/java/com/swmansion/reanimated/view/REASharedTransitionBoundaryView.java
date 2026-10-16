package com.swmansion.reanimated.view;

import android.content.Context;
import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import com.facebook.react.uimanager.PointerEvents;
import com.facebook.react.uimanager.ReactPointerEventsView;

public class REASharedTransitionBoundaryView extends ViewGroup implements ReactPointerEventsView {
  private final Rect mLayoutFrame = new Rect();
  private final OnLayoutChangeListener mParentLayoutListener =
      (parent, l, t, r, b, oldL, oldT, oldR, oldB) -> coverParent();

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
  protected void onLayout(boolean changed, int l, int t, int r, int b) {
    mLayoutFrame.set(l, t, r, b);
    coverParent();
  }

  @Override
  protected void onAttachedToWindow() {
    super.onAttachedToWindow();
    if (getParent() instanceof View parent) {
      parent.addOnLayoutChangeListener(mParentLayoutListener);
    }
    coverParent();
  }

  @Override
  protected void onDetachedFromWindow() {
    if (getParent() instanceof View parent) {
      parent.removeOnLayoutChangeListener(mParentLayoutListener);
    }
    super.onDetachedFromWindow();
  }

  // Android only delivers touches within a view's bounds, so a child moved
  // out of the laid out frame without a re-layout would stop receiving them.
  // Cover the whole parent, which bounds the touches anyway, and scroll the
  // children back to where the layout placed them.
  private void coverParent() {
    if (!(getParent() instanceof View parent)) {
      return;
    }
    int left = Math.min(mLayoutFrame.left, 0);
    int top = Math.min(mLayoutFrame.top, 0);
    setLeft(left);
    setTop(top);
    setRight(Math.max(mLayoutFrame.right, parent.getWidth()));
    setBottom(Math.max(mLayoutFrame.bottom, parent.getHeight()));
    scrollTo(left - mLayoutFrame.left, top - mLayoutFrame.top);
  }
}
