package com.swmansion.reanimated.layoutReanimation;

import android.content.Context;
import android.util.Log;
import android.view.View;
import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class TabNavigatorObserver {
  private final Set<Integer> mFragmentsWithListenerRegistry = new HashSet<>();
  private final ReaLayoutAnimator mReaLayoutAnimator;

  public TabNavigatorObserver(ReaLayoutAnimator reaLayoutAnimator) {
    mReaLayoutAnimator = reaLayoutAnimator;
  }

  public void handleScreenContainerUpdate(View screen) {
    try {
      Class<?> screenClass = screen.getClass();
      Method getScreenFragment = screenClass.getMethod("getFragment");
      Fragment fragment = (Fragment) getScreenFragment.invoke(screen);
      int fragmentTag = fragment.getId();
      if (!mFragmentsWithListenerRegistry.contains(fragmentTag)) {
        mFragmentsWithListenerRegistry.add(fragmentTag);
        fragment
            .getParentFragmentManager()
            .registerFragmentLifecycleCallbacks(new FragmentLifecycleCallbacks(fragment), true);
      }
    } catch (NoSuchMethodException | InvocationTargetException | IllegalAccessException e) {
      String message = e.getMessage() != null ? e.getMessage() : "Unable to get screen fragment";
      Log.e("[Reanimated]", message);
    }
  }

  class FragmentLifecycleCallbacks extends FragmentManager.FragmentLifecycleCallbacks {
    private View firstScreen;
    private Method getScreen;
    private Method getActivityState;
    private final Set<Integer> screenTagsWithListener = new HashSet<>();
    private final List<View> nextTransition = new ArrayList<>();

    public FragmentLifecycleCallbacks(Fragment fragment) {
      if (!ScreensHelper.isScreenFragment(fragment)) {
        return;
      }
      try {
        Class<?> screenFragmentClass = fragment.getClass();
        getScreen = screenFragmentClass.getMethod("getScreen");
        View screen = (View) getScreen.invoke(fragment);
        getActivityState = screen.getClass().getMethod("getActivityState");
        addScreenListener(screen);
      } catch (IllegalAccessException | InvocationTargetException | NoSuchMethodException e) {
        String message =
            e.getMessage() != null ? e.getMessage() : "Unable to get screen activity state";
        Log.e("[Reanimated]", message);
      }
    }

    private void addScreenListener(View screen)
        throws InvocationTargetException, IllegalAccessException {
      if (screenTagsWithListener.contains(screen.getId())) {
        return;
      }
      screenTagsWithListener.add(screen.getId());
      screen.addOnAttachStateChangeListener(new OnAttachStateChangeListener());
      screen.addOnLayoutChangeListener(
          (v, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) -> {
            if (nextTransition.isEmpty()) {
              return;
            }
            AnimationsManager animationsManager = mReaLayoutAnimator.getAnimationsManager();
            animationsManager.navigationTabChanged(nextTransition.get(0), nextTransition.get(1));
            nextTransition.clear();
          });
    }

    public void onFragmentAttached(
        FragmentManager fragmentManager, Fragment fragment, Context context) {
      onFragmentUpdate(fragment, true);
    }

    public void onFragmentDetached(FragmentManager fragmentManager, Fragment fragment) {
      onFragmentUpdate(fragment, false);
    }

    private void onFragmentUpdate(Fragment fragment, boolean isAttaching) {
      if (!ScreensHelper.isScreenFragment(fragment)) {
        return;
      }
      try {
        View screen = (View) getScreen.invoke(fragment);
        if (getActivityState.invoke(screen) == null) {
          return;
        }
        addScreenListener(screen);

        if (firstScreen == null) {
          firstScreen = screen;
          return;
        }

        if (isAttaching) {
          nextTransition.add(firstScreen);
          nextTransition.add(screen);
        } else {
          nextTransition.add(screen);
          nextTransition.add(firstScreen);
        }
        firstScreen = null;
      } catch (IllegalAccessException | NullPointerException | InvocationTargetException e) {
        String message = e.getMessage() != null ? e.getMessage() : "Unable to get screen view";
        Log.e("[Reanimated]", message);
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
