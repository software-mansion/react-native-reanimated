package com.swmansion.reanimated.sharedElementTransition;

import android.app.Activity;
import android.content.Context;
import android.content.res.Resources;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.AnimationSet;
import android.view.animation.Transformation;

import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.fragment.app.Fragment;

import com.swmansion.common.ScreenStackFragmentCommon;
import com.swmansion.common.SharedTransitionConfig;

import java.util.ArrayList;
import java.util.List;

public class ScreensCoordinatorLayout extends CoordinatorLayout {

    private ScreenStackFragmentCommon mFragment;
    private ScreensTransitionDelegate delegate;

    ScreensCoordinatorLayout(
        Context context,
        ScreenStackFragmentCommon mFragment,
        ScreensTransitionDelegate delegate
    ) {
        super(context);
        this.mFragment = mFragment;
        this.delegate = delegate;
    }

    public Integer getStatusBarHeight() {
        int result = 0;
        int resourceId = Resources.getSystem().getIdentifier(
            "status_bar_height",
            "dimen",
            "android"
        );
        if (resourceId > 0) {
            result = Resources.getSystem().getDimensionPixelSize(resourceId);
        }
        return result;
    }

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (mFragment.getShouldPerformSET()) {
            ViewGroup rootView = (ViewGroup) mFragment.tryGetActivity().getWindow().getDecorView().getRootView();
            rootView.addView(mFragment.getFragmentTransitionContainer());
            MarginLayoutParams transitionLayoutParams = (MarginLayoutParams)mFragment.getFragmentTransitionContainer().getLayoutParams();
            transitionLayoutParams.topMargin = getStatusBarHeight();
        }
    }

    @Override
    public void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        ViewGroup rootView = (ViewGroup) mFragment.tryGetActivity().getWindow().getDecorView().getRootView();
        if (mFragment.getFragmentTransitionContainer().getParent() == rootView) {
            rootView.removeView(mFragment.getFragmentTransitionContainer());
        }
    }

    private Animation.AnimationListener mAnimationListener = new Animation.AnimationListener() {
        @Override
        public void onAnimationStart(Animation animation) {
            mFragment.onViewAnimationStart();
            Activity activity = mFragment.tryGetActivity();
            if ((mFragment.getShouldPerformSET() && activity != null
                && mFragment.getFragmentTransitionContainer().getParent() != null)
                && !mFragment.getIsActiveTransition()
            ) {
                mFragment.setIsActiveTransition(true);
                List<SharedTransitionConfig> sharedElements = mFragment.getFragmentSharedElements();
                for (SharedTransitionConfig sharedTransitionConfig : sharedElements) {
                    delegate.makeSnapshot(sharedTransitionConfig.toView);
                }

                for (SharedTransitionConfig sharedTransitionConfig : sharedElements) {
                    View fromView = sharedTransitionConfig.fromView;
                    View toView = sharedTransitionConfig.toView;
                    toView.setVisibility(View.INVISIBLE);

                    ViewGroup fromViewParent = (ViewGroup)sharedTransitionConfig.fromViewParent;
                    fromViewParent.removeView(fromView);
                    mFragment.getFragmentTransitionContainer().addView(fromView);
                }

                for (SharedTransitionConfig sharedTransitionConfig : sharedElements) {
                    delegate.runTransition(
                        sharedTransitionConfig.fromView,
                        sharedTransitionConfig.toView
                    );
                }
            }
        }

        @Override
        public void onAnimationEnd(Animation animation) {
            mFragment.onViewAnimationEnd();
            if (mFragment.getShouldPerformSET() && mFragment.getFragmentTransitionContainer().getParent() != null) {
                ArrayList<View> toRemove = new ArrayList<>();

                List<SharedTransitionConfig> sharedElements = mFragment.getFragmentSharedElements();
                for (SharedTransitionConfig sharedTransitionConfig : sharedElements) {
                    View fromView = sharedTransitionConfig.fromView;
                    View toView = sharedTransitionConfig.toView;
                    toView.setVisibility(View.VISIBLE);

                    mFragment.getFragmentTransitionContainer().removeView(fromView);
                    ViewGroup parent = (ViewGroup)sharedTransitionConfig.fromViewParent;
                    parent.addView(fromView);
                    toRemove.add(fromView);
                }

                delegate.onNativeAnimationEnd(mFragment.getFragmentScreen(), toRemove);
                mFragment.setShouldPerformSET(false);
                mFragment.setIsActiveTransition(false);
            }
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
        ScreensAnimation fakeAnimation = new ScreensAnimation(mFragment);
        animation.setDuration(2000);
        fakeAnimation.setDuration(animation.getDuration());
        // val fakeAnimation = ScreensAnimation(mFragment).apply { duration = animation.duration }

        if (animation instanceof AnimationSet && !((Fragment)mFragment).isRemoving()) {
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
     * autoFocus is implemented it dismisses soft keyboard in fragment transition
     * due to change of visibility of the view at the start of the transition. Here we override the
     * call to `clearFocus` when the visibility of view is `INVISIBLE` since `clearFocus` triggers the
     * hiding of the keyboard in `ReactEditText.java`.
     */
    @Override
    public void clearFocus() {
        if (getVisibility() != INVISIBLE) {
            super.clearFocus();
        }
    }
}

class ScreensAnimation extends Animation {
    ScreenStackFragmentCommon mFragment;

    ScreensAnimation(ScreenStackFragmentCommon mFragment) {
        this.mFragment = mFragment;
    }

    @Override
    public void applyTransformation(float interpolatedTime, Transformation t) {
        super.applyTransformation(interpolatedTime, t);
        // interpolated time should be the progress of the current transition
        mFragment.dispatchTransitionProgress(interpolatedTime, !((Fragment)mFragment).isResumed());
    }
}
