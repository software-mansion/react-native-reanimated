package com.swmansion.reanimated.layoutReanimation;

import java.util.HashMap;
import java.util.Map;

public interface NativeMethodsHolder {
  void startAnimation(int tag, int type, HashMap<String, Object> values);

  boolean hasAnimation(int tag, int type);

  void clearAnimationConfig(int tag);

  void cancelAnimation(int tag, int type, boolean cancelled, boolean removeView);

  boolean isLayoutAnimationEnabled();

  int findPrecedingViewTagForTransition(int tag);

  Map<String, Object> computeSharedTransitionProgressAnimationForTag(
    int viewTag,
    double progress,
    Map<String, Object> snapshotValues
  );
}
