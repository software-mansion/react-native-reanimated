package com.swmansion.reanimated.layoutReanimation;

import android.content.Context;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class TabNavigatorObserver {
  private final Set<Integer> mFragmentsWithListenerRegistry = new HashSet<>();
  private final ReaLayoutAnimator mReaLayoutAnimator;

  public TabNavigatorObserver(ReaLayoutAnimator reaLayoutAnimator) {
    mReaLayoutAnimator = reaLayoutAnimator;
  }

  public void handleScreenContainerUpdate(View screen) throws InvocationTargetException, NoSuchMethodException, IllegalAccessException {
    Class<?> screenClass = screen.getClass();
    Method getScreenFragment = screenClass.getMethod("getFragment");
    Fragment fragment = (Fragment)getScreenFragment.invoke(screen);
    int fragmentTag = fragment.getId();
    if (!mFragmentsWithListenerRegistry.contains(fragmentTag)) {
      mFragmentsWithListenerRegistry.add(fragmentTag);
      fragment.getParentFragmentManager().registerFragmentLifecycleCallbacks(new FragmentLifecycleCallbacks(fragment), true);
    }
  }

  class FragmentLifecycleCallbacks extends FragmentManager.FragmentLifecycleCallbacks {
    private View firstScreen;
    private final Method getScreen;
    private final Method getActivityState;
    private final Set<Integer> screenTagsWithListener = new HashSet<>();
    private final List<View> transitionToTrigger = new ArrayList<>();

    public FragmentLifecycleCallbacks(Fragment fragment) throws NoSuchMethodException, InvocationTargetException, IllegalAccessException {
      Class<?> screenFragmentClass = fragment.getClass();
      getScreen = screenFragmentClass.getMethod("getScreen");
      View screen = (View)getScreen.invoke(fragment);
      getActivityState = screen.getClass().getMethod("getActivityState");
      addScreenListener(screen);
    }

    private void addScreenListener(View screen) throws InvocationTargetException, IllegalAccessException {
      if (!screenTagsWithListener.contains(screen.getId())) {
        screenTagsWithListener.add(screen.getId());
        screen.addOnAttachStateChangeListener(new OnAttachStateChangeListener());
        screen.addOnLayoutChangeListener((v, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) -> {
          if (!transitionToTrigger.isEmpty()) {
            AnimationsManager animationsManager = mReaLayoutAnimator.getAnimationsManager();
            animationsManager.navigationTabChanged(transitionToTrigger.get(0), transitionToTrigger.get(1));
            transitionToTrigger.clear();
          }
        });
      }
    }

    public void onFragmentAttached(FragmentManager fragmentManager, Fragment fragment, Context context) {
      onFragmentUpdate(fragment, true);
    }

    public void onFragmentDetached(FragmentManager fragmentManager, Fragment fragment) {
      onFragmentUpdate(fragment, false);
    }

    private void onFragmentUpdate(Fragment fragment, boolean isAttaching) {
      try {
        View screen = (View)getScreen.invoke(fragment);
        if (getActivityState.invoke(screen) == null) {
          return;
        }
        addScreenListener(screen);

        if (firstScreen == null) {
          firstScreen = screen;
          return;
        }

        if (isAttaching) {
          transitionToTrigger.add(firstScreen);
          transitionToTrigger.add(screen);
        } else {
          transitionToTrigger.add(screen);
          transitionToTrigger.add(firstScreen);
        }
        firstScreen = null;
      } catch (IllegalAccessException | InvocationTargetException e) {
        throw new RuntimeException(e);
      }
    }
  }

  class OnAttachStateChangeListener implements View.OnAttachStateChangeListener {
    @Override
    public void onViewAttachedToWindow(@NonNull View screen) {}

    @Override
    public void onViewDetachedFromWindow(@NonNull View screen) {
      AnimationsManager animationsManager = mReaLayoutAnimator.getAnimationsManager();
      animationsManager.visitNativeTreeAndMakeSnapshot(screen);
    }
  }

}
