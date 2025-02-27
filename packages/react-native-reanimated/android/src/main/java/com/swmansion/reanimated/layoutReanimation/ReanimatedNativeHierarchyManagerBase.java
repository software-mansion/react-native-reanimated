package com.swmansion.reanimated.layoutReanimation;

import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.ViewManagerRegistry;
import com.facebook.yoga.YogaDirection;

public abstract class ReanimatedNativeHierarchyManagerBase extends NativeViewHierarchyManager {
  public ReanimatedNativeHierarchyManagerBase(ViewManagerRegistry viewManagers) {
    super(viewManagers);
  }

  @Override
  public synchronized void updateLayout(
      int parentTag, int tag, int x, int y, int width, int height, YogaDirection yogaDirection) {
    super.updateLayout(parentTag, tag, x, y, width, height, yogaDirection);
    this.updateLayoutCommon(parentTag, tag, x, y, width, height);
  }

  public abstract void updateLayoutCommon(
      int parentTag, int tag, int x, int y, int width, int height);
}
