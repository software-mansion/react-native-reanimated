package com.swmansion.reanimated.sharedElementTransition;

import android.content.Context;
import android.view.View;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import com.swmansion.common.ScreenStackFragmentCommon;
import com.swmansion.common.SharedElementAnimatorDelegate;
import com.swmansion.reanimated.layoutReanimation.AnimationsManager;
import java.util.List;

public class ScreensSharedTransitionDelegate implements SharedElementAnimatorDelegate {
  private final SharedTransitionAnimationManager sharedTransitionAnimationManager;

  public ScreensSharedTransitionDelegate(AnimationsManager animationsManager) {
    this.sharedTransitionAnimationManager = new SharedTransitionAnimationManager(animationsManager);
  }

  @Override
  public boolean shouldStartDefaultTransitionForView(View view) {
    return sharedTransitionAnimationManager.shouldStartDefaultTransitionForView(view);
  }

  @Override
  public void onNativeAnimationEnd(View screen, List<View> toRemove) {
    sharedTransitionAnimationManager.onNativeAnimationEnd(screen, toRemove);
  }

  @Override
  public void onScreenTransitionCreate(View currentScreen, View targetScreen) {
    sharedTransitionAnimationManager.onScreenTransitionCreate(currentScreen, targetScreen);
  }

  @Override
  public void onScreenRemoving(View screen) {
    sharedTransitionAnimationManager.onScreenRemoving(screen);
  }

  @Override
  public CoordinatorLayout makeAnimationCoordinatorLayout(
      Context context, ScreenStackFragmentCommon fragment) {
    return new SharedTransitionCoordinatorLayout(
        context, fragment, sharedTransitionAnimationManager);
  }

  public void registerSharedTransitionTag(String sharedTransitionTag, int viewTag) {
    sharedTransitionAnimationManager.registerSharedTransitionTag(sharedTransitionTag, viewTag);
  }

  public void unregisterSharedTransitionTag(String sharedTransitionTag, int viewTag) {
    sharedTransitionAnimationManager.unregisterSharedTransitionTag(sharedTransitionTag, viewTag);
  }
}
