package com.swmansion.reanimated.sharedElementTransition;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.res.Resources;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.AnimationSet;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.fragment.app.Fragment;
import com.swmansion.common.ScreenStackFragmentCommon;
import java.util.ArrayList;
import java.util.List;

@SuppressLint("ViewConstructor")
public class SharedTransitionCoordinatorLayout extends CoordinatorLayout {

  private final ScreenStackFragmentCommon fragment;
  private final SharedTransitionAnimationManager sharedTransitionAnimationManager;
  private final CoordinatorLayout transitionContainer;

  SharedTransitionCoordinatorLayout(
      Context context,
      ScreenStackFragmentCommon fragment,
      SharedTransitionAnimationManager sharedTransitionAnimationManager) {
    super(context);
    this.fragment = fragment;
    this.sharedTransitionAnimationManager = sharedTransitionAnimationManager;
    transitionContainer = new PreventLayoutCoordinatorLayout(context);
  }

  public Integer getStatusBarHeight() {
    int result = 0;
    int resourceId = Resources.getSystem().getIdentifier("status_bar_height", "dimen", "android");
    if (resourceId > 0) {
      result = Resources.getSystem().getDimensionPixelSize(resourceId);
    }
    return result;
  }

  @Override
  public void onAttachedToWindow() {
    super.onAttachedToWindow();
    if (sharedTransitionAnimationManager.shouldPerformSharedElementTransition(
        fragment.getFragmentScreen())) {
      ViewGroup rootView =
          (ViewGroup) fragment.tryGetActivity().getWindow().getDecorView().getRootView();
      rootView.addView(transitionContainer);
      MarginLayoutParams transitionLayoutParams =
          (MarginLayoutParams) transitionContainer.getLayoutParams();
      transitionLayoutParams.topMargin = getStatusBarHeight();
    }
  }

  @Override
  public void onDetachedFromWindow() {
    super.onDetachedFromWindow();
    ViewGroup rootView =
        (ViewGroup) fragment.tryGetActivity().getWindow().getDecorView().getRootView();
    if (transitionContainer.getParent() == rootView) {
      rootView.removeView(transitionContainer);
    }
  }

  private final Animation.AnimationListener mAnimationListener =
      new Animation.AnimationListener() {
        @Override
        public void onAnimationStart(Animation animation) {
          fragment.onViewAnimationStart();
          Activity activity = fragment.tryGetActivity();
          List<SharedTransitionConfig> sharedElements =
              sharedTransitionAnimationManager.getScreenSharedElementsRegistry(
                  fragment.getFragmentScreen());
          if ((sharedElements != null
                  && activity != null
                  && transitionContainer.getParent() != null)
              && !sharedTransitionAnimationManager.getTransitionState(
                  fragment.getFragmentScreen())) {
            sharedTransitionAnimationManager.setTransitionState(fragment.getFragmentScreen(), true);
            for (SharedTransitionConfig sharedTransitionConfig : sharedElements) {
              sharedTransitionAnimationManager.makeSnapshot(sharedTransitionConfig.toView);
            }

            for (SharedTransitionConfig sharedTransitionConfig : sharedElements) {
              View fromView = sharedTransitionConfig.fromView;
              View toView = sharedTransitionConfig.toView;
              toView.setVisibility(View.INVISIBLE);

              ViewGroup fromViewParent = (ViewGroup) sharedTransitionConfig.fromViewParent;
              fromViewParent.removeView(fromView);
              transitionContainer.addView(fromView);
            }

            for (SharedTransitionConfig sharedTransitionConfig : sharedElements) {
              sharedTransitionAnimationManager.runTransition(
                  sharedTransitionConfig.fromView, sharedTransitionConfig.toView);
            }
          }
        }

        @Override
        public void onAnimationEnd(Animation animation) {
          fragment.onViewAnimationEnd();
          List<SharedTransitionConfig> sharedElements =
              sharedTransitionAnimationManager.getScreenSharedElementsRegistry(
                  fragment.getFragmentScreen());
          if (sharedElements != null && transitionContainer.getParent() != null) {
            ArrayList<View> toRemove = new ArrayList<>();
            for (SharedTransitionConfig sharedTransitionConfig : sharedElements) {
              View fromView = sharedTransitionConfig.fromView;
              View toView = sharedTransitionConfig.toView;
              toView.setVisibility(View.VISIBLE);

              transitionContainer.removeView(fromView);
              ViewGroup parent = (ViewGroup) sharedTransitionConfig.fromViewParent;
              parent.addView(fromView);
              toRemove.add(fromView);
            }

            sharedTransitionAnimationManager.onNativeAnimationEnd(
                fragment.getFragmentScreen(), toRemove);
            sharedTransitionAnimationManager.setTransitionState(
                fragment.getFragmentScreen(), false);
          }
          sharedTransitionAnimationManager.removeScreenSharedElementsRegistry(
              fragment.getFragmentScreen());
        }

        @Override
        public void onAnimationRepeat(Animation animation) {}
      };

  @Override
  public void startAnimation(Animation animation) {
    // For some reason View##onAnimationEnd doesn't get called for
    // exit transitions so we explicitly attach animation listener.
    // We also have some animations that are an AnimationSet, so we don't wrap them
    // in another set since it causes some visual glitches when going forward.
    // We also set the listener only when going forward, since when going back,
    // there is already a listener for dismiss action added, which would be overridden
    // and also this is not necessary when going back since the lifecycle methods
    // are correctly dispatched then.
    // We also add fakeAnimation to the set of animations, which sends the progress of animation
    ScreensAnimation fakeAnimation = new ScreensAnimation(fragment);
    animation.setDuration(2000);
    fakeAnimation.setDuration(animation.getDuration());
    // val fakeAnimation = ScreensAnimation(mFragment).apply { duration = animation.duration }

    if (animation instanceof AnimationSet && !((Fragment) fragment).isRemoving()) {
      ((AnimationSet) animation).addAnimation(fakeAnimation);
      animation.setAnimationListener(mAnimationListener);
      super.startAnimation(animation);
    } else {
      AnimationSet animationSet = new AnimationSet(true);
      animationSet.addAnimation(animation);
      animationSet.addAnimation(fakeAnimation);
      animationSet.setAnimationListener(mAnimationListener);
      super.startAnimation(animationSet);
    }
  }

  /**
   * This method implements a workaround for RN's autoFocus functionality. Because of the way
   * autoFocus is implemented it dismisses soft keyboard in fragment transition due to change of
   * visibility of the view at the start of the transition. Here we override the call to
   * `clearFocus` when the visibility of view is `INVISIBLE` since `clearFocus` triggers the hiding
   * of the keyboard in `ReactEditText.java`.
   */
  @Override
  public void clearFocus() {
    if (getVisibility() != INVISIBLE) {
      super.clearFocus();
    }
  }
}
