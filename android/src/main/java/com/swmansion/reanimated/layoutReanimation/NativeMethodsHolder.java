package com.swmansion.reanimated.layoutReanimation;

import java.util.HashMap;

public interface NativeMethodsHolder {
  void startAnimation(int tag, String type, HashMap<String, Object> values);

  boolean hasAnimation(int tag, String type);

  void clearAnimationConfig(int tag);

  void cancelAnimation(int tag, String type, boolean cancelled, boolean removeView);

  boolean isLayoutAnimationEnabled();

  int findPrecedingViewTagForTransition(int tag);
}
