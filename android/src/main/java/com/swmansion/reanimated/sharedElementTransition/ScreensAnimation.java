package com.swmansion.reanimated.sharedElementTransition;

import android.view.animation.Animation;
import android.view.animation.Transformation;
import androidx.fragment.app.Fragment;
import com.swmansion.common.ScreenStackFragmentCommon;

public class ScreensAnimation extends Animation {
  ScreenStackFragmentCommon mFragment;

  ScreensAnimation(ScreenStackFragmentCommon mFragment) {
    this.mFragment = mFragment;
  }

  @Override
  public void applyTransformation(float interpolatedTime, Transformation t) {
    super.applyTransformation(interpolatedTime, t);
    // interpolated time should be the progress of the current transition
    mFragment.dispatchTransitionProgress(interpolatedTime, !((Fragment) mFragment).isResumed());
  }
}
